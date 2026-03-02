"""
Module 4 — Revenue Impact Calculator
Translates churn predictions into financial metrics.
"""


def calculate_revenue_impact(
    at_risk_customers: int,
    avg_order_value: float,
    coupon_amount: float,
    retention_rate: float,   # as a percentage, e.g. 30 means 30%
) -> dict:
    """
    Calculate the financial impact of a targeted retention campaign.

    Returns
    -------
    dict with: revenue_at_risk, campaign_cost, customers_retained,
               revenue_saved, net_roi, roi_percentage
    """
    retention_rate_decimal = retention_rate / 100.0

    revenue_at_risk = at_risk_customers * avg_order_value
    campaign_cost = at_risk_customers * coupon_amount
    customers_retained = int(at_risk_customers * retention_rate_decimal)
    revenue_saved = customers_retained * avg_order_value
    net_roi = revenue_saved - campaign_cost

    roi_percentage = (net_roi / campaign_cost * 100) if campaign_cost > 0 else 0

    return {
        "at_risk_customers": at_risk_customers,
        "revenue_at_risk": round(revenue_at_risk, 2),
        "campaign_cost": round(campaign_cost, 2),
        "customers_retained": customers_retained,
        "revenue_saved": round(revenue_saved, 2),
        "net_roi": round(net_roi, 2),
        "roi_percentage": round(roi_percentage, 2),
    }
