"""
Module 5 — Smart Retention Suggestions
Rule-based engine that recommends retention actions
based on customer attributes and churn risk factors.
"""


def get_suggestion(customer: dict) -> dict:
    """
    Analyse a single customer's data and return a targeted retention suggestion.

    Parameters
    ----------
    customer : dict
        Must contain keys like DaySinceLastOrder, SatisfactionScore,
        Complain, CashbackAmount, Tenure, etc.

    Returns
    -------
    dict with keys: reason, suggestion, action_type
    """
    days_since = float(customer.get("DaySinceLastOrder", 0) or 0)
    satisfaction = int(customer.get("SatisfactionScore", 3) or 3)
    complain = int(customer.get("Complain", 0) or 0)
    cashback = float(customer.get("CashbackAmount", 100) or 100)
    tenure = float(customer.get("Tenure", 12) or 12)

    # Priority-based rules (most urgent first)

    if complain == 1:
        return {
            "reason": "Customer raised a complaint recently",
            "suggestion": "Escalate complaint to senior support. Offer full refund or ₹200 coupon as goodwill gesture. Follow up within 24 hours.",
            "action_type": "call",
        }

    if satisfaction <= 2:
        return {
            "reason": f"Very low satisfaction score ({satisfaction}/5)",
            "suggestion": "Assign a dedicated support agent. Send a personalised apology email with a replacement offer or significant discount on next order.",
            "action_type": "call",
        }

    if days_since > 30:
        return {
            "reason": f"No order in {int(days_since)} days — going inactive",
            "suggestion": "Send a 'We miss you' email with free delivery on next order. Include a time-limited ₹100 cashback coupon to create urgency.",
            "action_type": "email",
        }

    if cashback < 50:
        return {
            "reason": f"Low cashback amount (₹{cashback:.0f}) — not incentivised enough",
            "suggestion": "Enrol in the cashback loyalty programme with guaranteed 10% cashback on next 3 orders. Highlight savings in a WhatsApp message.",
            "action_type": "coupon",
        }

    if tenure < 3:
        return {
            "reason": f"New customer (tenure {tenure:.0f} months) — still in trial phase",
            "suggestion": "Send an onboarding tips email series. Include a first-repeat-order discount of 15% and recommend trending products.",
            "action_type": "email",
        }

    if satisfaction == 3:
        return {
            "reason": "Average satisfaction — could tip either way",
            "suggestion": "Send a quick feedback survey with a ₹50 coupon reward. Use responses to personalise future offers.",
            "action_type": "email",
        }

    # Default — customer looks okay
    return {
        "reason": "No major churn signals detected",
        "suggestion": "Continue regular engagement. Consider enrolling in a loyalty tier programme to strengthen retention.",
        "action_type": "email",
    }
