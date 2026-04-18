"""
Module 5 — Smart Retention Suggestions
Maps specific churn signals to prioritised, targeted retention actions.

Public API
----------
map_churn_reasons(customer)  →  list of ranked ChurnSignal dicts (all signals)
get_suggestion(customer)     →  single best RetentionSuggestion dict
"""

from __future__ import annotations

# ────────────────────────────────────────────────────────────────
# Signal definitions  (ordered by business impact)
# ────────────────────────────────────────────────────────────────

# Each entry: rank (1=highest), key, label, action_type, reason template, suggestion, test fn
_SIGNALS: list[dict] = [
    {
        "rank":        1,
        "key":         "active_complaint",
        "label":       "Active complaint filed",
        "action_type": "call",
        "reason_tpl":  "Customer raised a complaint recently",
        "suggestion":  (
            "Escalate to senior support within 2 hours. Offer a full refund or ₹200 "
            "goodwill coupon. Assign a dedicated agent and send a personal apology note."
        ),
        "test": lambda c: int(c.get("Complain", 0) or 0) == 1,
    },
    {
        "rank":        2,
        "key":         "very_low_satisfaction",
        "label":       "Critically low satisfaction (1-2/5)",
        "action_type": "call",
        "reason_tpl":  "Satisfaction score is {SatisfactionScore}/5 — critically low",
        "suggestion":  (
            "Personal outreach by a senior agent with sincere apology. "
            "Offer 20% discount plus free delivery on the next 2 orders."
        ),
        "test": lambda c: int(c.get("SatisfactionScore", 3) or 3) <= 2,
    },
    {
        "rank":        3,
        "key":         "long_inactivity",
        "label":       "No order for 30+ days",
        "action_type": "email",
        "reason_tpl":  "No order in {DaySinceLastOrder:.0f} days — customer going dormant",
        "suggestion":  (
            "Send a 'We miss you' message with free delivery + a time-limited "
            "₹100 cashback coupon (expires in 5 days) to create urgency."
        ),
        "test": lambda c: float(c.get("DaySinceLastOrder", 0) or 0) > 30,
    },
    {
        "rank":        4,
        "key":         "new_customer_at_risk",
        "label":       "New customer (< 3 months) with low engagement",
        "action_type": "email",
        "reason_tpl":  "New customer (tenure {Tenure:.0f} months) — at-risk during onboarding",
        "suggestion":  (
            "Send a personalised onboarding series: trending picks, 15% first-repeat "
            "discount, and a short product tutorial relevant to their order category."
        ),
        "test": lambda c: float(c.get("Tenure", 12) or 12) < 3,
    },
    {
        "rank":        5,
        "key":         "high_price_sensitivity",
        "label":       "Significant YoY order value hike",
        "action_type": "coupon",
        "reason_tpl":  (
            "Order amount hiked {OrderAmountHikeFromlastYear:.0f}% year-on-year — "
            "customer may feel pricing pressure"
        ),
        "suggestion":  (
            "Offer a targeted price-match coupon or highlight ongoing sale items. "
            "Enrol in a 'Price Drop Alert' to rebuild trust in value."
        ),
        "test": lambda c: float(c.get("OrderAmountHikeFromlastYear", 15) or 15) > 20,
    },
    {
        "rank":        6,
        "key":         "low_cashback",
        "label":       "Under-incentivised (cashback < Rs 50)",
        "action_type": "coupon",
        "reason_tpl":  "Low cashback balance ({CashbackAmount:.0f}) — not feeling rewarded",
        "suggestion":  (
            "Enrol in the loyalty cashback programme: guaranteed 10% cashback on next "
            "3 orders. Highlight cumulative savings in a WhatsApp push."
        ),
        "test": lambda c: float(c.get("CashbackAmount", 100) or 100) < 50,
    },
    {
        "rank":        7,
        "key":         "moderate_inactivity",
        "label":       "No order for 15-30 days",
        "action_type": "email",
        "reason_tpl":  "No order in {DaySinceLastOrder:.0f} days — engagement cooling",
        "suggestion":  (
            "Re-engage with a curated 'Top Picks for You' email. "
            "Include a Rs 75 voucher valid for 72 hours."
        ),
        "test": lambda c: 15 <= float(c.get("DaySinceLastOrder", 0) or 0) <= 30,
    },
    {
        "rank":        8,
        "key":         "low_app_usage",
        "label":       "Low app engagement (< 1 hr/day)",
        "action_type": "email",
        "reason_tpl":  "Only {HourSpendOnApp:.1f} hrs/day on app — low digital engagement",
        "suggestion":  (
            "Send an app feature highlight email with an exclusive in-app-only discount. "
            "Prompt push-notification opt-in to re-establish the habit loop."
        ),
        "test": lambda c: float(c.get("HourSpendOnApp", 3) or 3) < 1,
    },
    {
        "rank":        9,
        "key":         "low_order_frequency",
        "label":       "Very few orders placed (2 or fewer)",
        "action_type": "coupon",
        "reason_tpl":  "Only {OrderCount:.0f} orders placed — not yet a habitual buyer",
        "suggestion":  (
            "Bundle incentive: 'Order 2 more times this month and get Rs 150 cashback.' "
            "Highlight subscription/bundle deals to increase order cadence."
        ),
        "test": lambda c: float(c.get("OrderCount", 5) or 5) <= 2,
    },
    {
        "rank":        10,
        "key":         "average_satisfaction",
        "label":       "Average satisfaction — could tip either way",
        "action_type": "email",
        "reason_tpl":  "Satisfaction score is {SatisfactionScore}/5 — neutral, needs nudge",
        "suggestion":  (
            "Send a quick 2-question feedback survey with a Rs 50 reward coupon. "
            "Use responses to personalise future communications."
        ),
        "test": lambda c: int(c.get("SatisfactionScore", 3) or 3) == 3,
    },
]


# ────────────────────────────────────────────────────────────────
# Internal helpers
# ────────────────────────────────────────────────────────────────

def _render_reason(tpl: str, customer: dict) -> str:
    """Safely format the reason template with available customer values."""
    try:
        numeric_vals = {
            k: float(v) for k, v in customer.items()
            if v is not None and isinstance(v, (int, float, str))
            and str(v).lstrip("-").replace(".", "", 1).isdigit()
        }
        return tpl.format(**{**customer, **numeric_vals})
    except (KeyError, ValueError):
        return tpl


def map_churn_reasons(customer: dict) -> list[dict]:
    """
    Evaluate all churn signals and return every triggered one, sorted by priority.

    Returns
    -------
    list of dicts, each with:
        rank        int   -- 1 = highest priority
        key         str   -- machine-readable signal ID
        label       str   -- human-readable signal name
        reason      str   -- rendered reason string for this customer
        suggestion  str   -- targeted retention action
        action_type str   -- 'call' | 'email' | 'coupon'
    """
    triggered = []
    for sig in _SIGNALS:
        try:
            fired = sig["test"](customer)
        except Exception:
            fired = False
        if fired:
            triggered.append({
                "rank":        sig["rank"],
                "key":         sig["key"],
                "label":       sig["label"],
                "reason":      _render_reason(sig["reason_tpl"], customer),
                "suggestion":  sig["suggestion"],
                "action_type": sig["action_type"],
            })
    return sorted(triggered, key=lambda x: x["rank"])


def get_suggestion(customer: dict) -> dict:
    """
    Return the single highest-priority retention suggestion for one customer.

    Returns
    -------
    {
      reason:         str   -- primary churn reason
      suggestion:     str   -- recommended action text
      action_type:    str   -- 'call' | 'email' | 'coupon'
      churn_signals:  list  -- all triggered signals (ranked), useful as LLM context
      priority:       str   -- 'critical' | 'high' | 'medium' | 'low'
    }
    """
    signals = map_churn_reasons(customer)

    if signals:
        top  = signals[0]
        rank = top["rank"]
        if rank <= 2:
            priority = "critical"
        elif rank <= 5:
            priority = "high"
        elif rank <= 8:
            priority = "medium"
        else:
            priority = "low"
        return {
            "reason":        top["reason"],
            "suggestion":    top["suggestion"],
            "action_type":   top["action_type"],
            "churn_signals": signals,
            "priority":      priority,
        }

    return {
        "reason":        "No major churn signals detected",
        "suggestion":    (
            "Continue regular engagement. Consider enrolling in a loyalty "
            "tier programme to strengthen long-term retention."
        ),
        "action_type":   "email",
        "churn_signals": [],
        "priority":      "low",
    }
