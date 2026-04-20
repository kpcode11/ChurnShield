"""
Module 4 — Revenue Impact Calculator
Translates churn predictions into financial metrics.

Public API
----------
calculate_revenue_impact(...)          — simple aggregate calculator (legacy /revenue)
calculate_customer_revenue_risk(...)   — per-customer at-risk revenue + tier aggregation
calculate_roi(...)                     — ROI given campaign cost and retention rate
"""

from __future__ import annotations


# ──────────────────────────────────────────────────────────────────
# Risk classification helper
# ──────────────────────────────────────────────────────────────────

_RISK_LOW_THRESHOLD  = 0.30
_RISK_HIGH_THRESHOLD = 0.60

def _classify_risk(probability: float) -> str:
    if probability < _RISK_LOW_THRESHOLD:
        return "Low"
    if probability < _RISK_HIGH_THRESHOLD:
        return "Medium"
    return "High"


# ──────────────────────────────────────────────────────────────────
# 1. Legacy aggregate calculator  (used by POST /revenue)
# ──────────────────────────────────────────────────────────────────

def calculate_revenue_impact(
    at_risk_customers: int,
    avg_order_value: float,
    coupon_amount: float,
    retention_rate: float,   # percentage, e.g. 30 means 30 %
    orders_per_year: float = 1.0,
) -> dict:
    """
    Simple aggregate revenue-impact calculation.
    All customers are assumed to carry the same average order value.
    """
    retention_frac    = retention_rate / 100.0
    revenue_at_risk   = at_risk_customers * avg_order_value * orders_per_year
    campaign_cost     = at_risk_customers * coupon_amount
    customers_retained = int(at_risk_customers * retention_frac)
    revenue_saved     = customers_retained * avg_order_value * orders_per_year
    net_roi           = revenue_saved - campaign_cost
    roi_percentage    = (net_roi / campaign_cost * 100) if campaign_cost > 0 else 0.0

    return {
        "at_risk_customers":  at_risk_customers,
        "revenue_at_risk":    round(revenue_at_risk,   2),
        "campaign_cost":      round(campaign_cost,     2),
        "customers_retained": customers_retained,
        "revenue_saved":      round(revenue_saved,     2),
        "net_roi":            round(net_roi,            2),
        "roi_percentage":     round(roi_percentage,    2),
        "orders_per_year":    orders_per_year,
    }


# ──────────────────────────────────────────────────────────────────
# 2. Per-customer at-risk revenue aggregation
# ──────────────────────────────────────────────────────────────────

def calculate_customer_revenue_risk(customers: list[dict]) -> dict:
    """
    Compute at-risk revenue for each customer individually, then aggregate.

    Each element of `customers` must contain:
      churn_probability  float  0.0–1.0  (from the ML model)
      revenue_value      float  per-order revenue in any currency
      orders_per_year    float  (default 1.0)
      risk_level         str    optional — classified automatically if absent
      customer_id        any    optional — passed through for tracing

    Formula
    -------
      annual_revenue = revenue_value × orders_per_year
      at_risk_revenue = churn_probability × annual_revenue

    Returns
    -------
    {
      total_customers            int
      total_revenue_base         float  — sum of all annual revenues
      total_revenue_at_risk      float  — probability-weighted at-risk revenue
      weighted_churn_probability float  — mean churn probability (0–1)
      weighted_churn_probability_pct float — same as % (0–100)
      by_risk_tier               dict   — High / Medium / Low breakdown
      top_at_risk_customers      list   — top 10 by at_risk_revenue (for the dashboard table)
    }
    """
    if not customers:
        return {
            "total_customers": 0,
            "total_revenue_base": 0.0,
            "total_revenue_at_risk": 0.0,
            "weighted_churn_probability": 0.0,
            "weighted_churn_probability_pct": 0.0,
            "by_risk_tier": {t: {"customers": 0, "revenue_at_risk": 0.0, "share_pct": 0.0}
                             for t in ("High", "Medium", "Low")},
            "top_at_risk_customers": [],
        }

    tier_buckets: dict[str, dict] = {
        "High":   {"customers": 0, "revenue_at_risk": 0.0},
        "Medium": {"customers": 0, "revenue_at_risk": 0.0},
        "Low":    {"customers": 0, "revenue_at_risk": 0.0},
    }

    total_base    = 0.0
    total_at_risk = 0.0
    sum_prob      = 0.0
    enriched: list[dict] = []

    for c in customers:
        prob     = float(c["churn_probability"])
        rev      = float(c["revenue_value"])
        opy      = float(c.get("orders_per_year", 1.0))
        risk     = c.get("risk_level") or _classify_risk(prob)

        annual   = rev * opy
        at_risk  = round(prob * annual, 2)

        total_base    += annual
        total_at_risk += at_risk
        sum_prob      += prob

        tier_buckets.setdefault(risk, {"customers": 0, "revenue_at_risk": 0.0})
        tier_buckets[risk]["customers"]     += 1
        tier_buckets[risk]["revenue_at_risk"] += at_risk

        enriched.append({
            "customer_id":      c.get("customer_id"),
            "churn_probability": prob,
            "annual_revenue":    round(annual, 2),
            "at_risk_revenue":   at_risk,
            "risk_level":        risk,
        })

    n            = len(customers)
    weighted_avg = sum_prob / n

    # Build tier breakdown with share percentages
    by_tier = {}
    for tier, bucket in tier_buckets.items():
        share = (bucket["revenue_at_risk"] / total_at_risk * 100) if total_at_risk > 0 else 0.0
        by_tier[tier] = {
            "customers":       bucket["customers"],
            "revenue_at_risk": round(bucket["revenue_at_risk"], 2),
            "share_pct":       round(share, 1),
        }

    # Top 10 customers by at-risk revenue for the dashboard priority table
    top10 = sorted(enriched, key=lambda x: x["at_risk_revenue"], reverse=True)[:10]

    return {
        "total_customers":                n,
        "total_revenue_base":             round(total_base, 2),
        "total_revenue_at_risk":          round(total_at_risk, 2),
        "weighted_churn_probability":     round(weighted_avg, 4),
        "weighted_churn_probability_pct": round(weighted_avg * 100, 1),
        "by_risk_tier":                   by_tier,
        "top_at_risk_customers":          top10,
    }


# ──────────────────────────────────────────────────────────────────
# 3. ROI calculator
# ──────────────────────────────────────────────────────────────────

def calculate_roi(
    total_at_risk_customers:    int,
    total_revenue_at_risk:      float,
    campaign_cost_per_customer: float,
    retention_rate:             float,   # percentage, e.g. 30
) -> dict:
    """
    Calculate campaign ROI from granular revenue-risk inputs.

    Formulas
    --------
      campaign_cost          = total_at_risk_customers × cost_per_customer
      customers_retained     = total_at_risk_customers × retention_rate / 100
      avg_at_risk_per_cust   = total_revenue_at_risk / total_at_risk_customers
      revenue_saved          = customers_retained × avg_at_risk_per_cust
      net_roi                = revenue_saved − campaign_cost
      roi_percentage         = net_roi / campaign_cost × 100
      payback_ratio          = revenue_saved / campaign_cost
      break_even_retention   = campaign_cost / total_revenue_at_risk × 100
        (= minimum retention rate at which the campaign covers its own cost)

    Returns
    -------
    {
      campaign_cost                  float
      customers_retained             int
      revenue_saved                  float
      net_roi                        float
      roi_percentage                 float
      payback_ratio                  float   — revenue_saved per £1 spent
      break_even_retention_rate_pct  float   — minimum % needed to break even
      is_roi_positive                bool
    }
    """
    retention_frac  = retention_rate / 100.0
    campaign_cost   = total_at_risk_customers * campaign_cost_per_customer
    customers_retained = int(total_at_risk_customers * retention_frac)

    avg_at_risk_per_cust = (
        total_revenue_at_risk / total_at_risk_customers
        if total_at_risk_customers > 0 else 0.0
    )
    revenue_saved = customers_retained * avg_at_risk_per_cust
    net_roi       = revenue_saved - campaign_cost

    roi_percentage = (
        net_roi / campaign_cost * 100 if campaign_cost > 0 else 0.0
    )
    payback_ratio = (
        revenue_saved / campaign_cost if campaign_cost > 0 else 0.0
    )
    break_even_rate = (
        campaign_cost / total_revenue_at_risk * 100
        if total_revenue_at_risk > 0 else 0.0
    )

    return {
        "campaign_cost":                 round(campaign_cost,    2),
        "customers_retained":            customers_retained,
        "revenue_saved":                 round(revenue_saved,    2),
        "net_roi":                       round(net_roi,           2),
        "roi_percentage":                round(roi_percentage,   2),
        "payback_ratio":                 round(payback_ratio,    4),
        "break_even_retention_rate_pct": round(break_even_rate,  2),
        "is_roi_positive":               net_roi > 0,
    }
