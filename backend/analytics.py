"""
Module 3 — Analytics Engine

Pandas aggregation and time-series processing for the Live Analytics Dashboard.
Enhanced with Random Forest model insights and real feature importance data.

All compute_* functions accept a pre-loaded DataFrame and return plain Python
dicts / lists that FastAPI can serialise directly to JSON.

Column reference (E Commerce Dataset.xlsx, sheet "E Comm"):
  CustomerID, Churn, Tenure, PreferredLoginDevice, CityTier, WarehouseToHome,
  PreferredPaymentMode, Gender, HourSpendOnApp, NumberOfDeviceRegistered,
  PreferedOrderCat, SatisfactionScore, MaritalStatus, NumberOfAddress,
  Complain, OrderAmountHikeFromlastYear, CouponUsed, OrderCount,
  DaySinceLastOrder, CashbackAmount
"""

from __future__ import annotations

import math
import os
import pandas as pd
import joblib


# ── Helpers ─────────────────────────────────────────────────────────────────

def _safe_round(value, ndigits: int = 2) -> float:
    """Coerce any numeric value to a finite float rounded to ndigits, or 0.0."""
    try:
        f = float(value)
        return round(f, ndigits) if math.isfinite(f) else 0.0
    except (TypeError, ValueError):
        return 0.0


def _safe_mean(series: pd.Series) -> float:
    """Return the mean of a series as a safe rounded float."""
    return _safe_round(series.dropna().mean())


def _group_churn_rate(df: pd.DataFrame, col: str) -> dict[str, float]:
    """
    Group df by a categorical column, compute churn rate (%) per group.

    Drops rows where the grouping column is NaN.
    Keys are always strings so JSON serialisation is safe.
    """
    return (
        df.dropna(subset=[col])
        .groupby(col, observed=True)["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .pipe(lambda s: {str(k): _safe_round(v) for k, v in s.items()})
    )


# ── Core aggregation functions ───────────────────────────────────────────────

def compute_overview(df: pd.DataFrame) -> dict:
    """Top-level KPI summary: total customers, churned count, overall rate."""
    total   = len(df)
    churned = int(df["Churn"].sum())
    return {
        "total_customers":   total,
        "churned_customers": churned,
        "overall_churn_rate": round(churned / total * 100, 2) if total else 0.0,
    }


def compute_churn_by_group(df: pd.DataFrame) -> dict:
    """
    Churn rates aggregated by every categorical dimension in the dataset.

    Returns a flat dict:
      churn_by_city_tier        → {str(tier): pct}
      churn_by_gender           → {gender: pct}
      churn_by_satisfaction     → {str(score): pct}
      churn_by_device           → {device_name: pct}
      churn_by_marital_status   → {status: pct}
      churn_by_category         → {category: pct}
      churn_by_payment_mode     → {mode: pct}
    """
    return {
        "churn_by_city_tier":      _group_churn_rate(df, "CityTier"),
        "churn_by_gender":         _group_churn_rate(df, "Gender"),
        "churn_by_satisfaction":   _group_churn_rate(df, "SatisfactionScore"),
        "churn_by_device":         _group_churn_rate(df, "PreferredLoginDevice"),
        "churn_by_marital_status": _group_churn_rate(df, "MaritalStatus"),
        "churn_by_category":       _group_churn_rate(df, "PreferedOrderCat"),
        "churn_by_payment_mode":   _group_churn_rate(df, "PreferredPaymentMode"),
    }


def compute_tenure_bands(df: pd.DataFrame) -> dict:
    """
    Bucket customers into 8 tenure bands and compute churn rate per band.

    Uses pd.cut with right=True by default (bins are half-open intervals).
    Returns {"churn_by_tenure": {"0-6": pct, "7-12": pct, ...}}.
    """
    bins   = [0, 6, 12, 18, 24, 36, 48, 60, 100]
    labels = ["0-6", "7-12", "13-18", "19-24", "25-36", "37-48", "49-60", "60+"]
    tdf = df.copy()
    tdf["_band"] = pd.cut(tdf["Tenure"], bins=bins, labels=labels, include_lowest=True)
    churn_by_tenure = (
        tdf.groupby("_band", observed=False)["Churn"]
        .mean()
        .mul(100)
        .round(2)
    )
    return {
        "churn_by_tenure": {str(k): _safe_round(v) for k, v in churn_by_tenure.items()},
    }


def compute_kpi_comparison(df: pd.DataFrame) -> dict:
    """
    For each numeric KPI, compute the mean separately for churned vs stayed
    customers.  Used by the frontend to render side-by-side comparison cards
    that reveal behavioural differences between the two groups.

    KPI list:
      avg_cashback, avg_orders, avg_order_hike_pct, avg_app_hours,
      avg_days_since_order, avg_warehouse_to_home, avg_coupons_used,
      avg_num_devices, avg_complain_rate (%)
    """
    churned = df[df["Churn"] == 1]
    stayed  = df[df["Churn"] == 0]

    def _pair(col: str) -> dict[str, float]:
        return {
            "churned": _safe_mean(churned[col]),
            "stayed":  _safe_mean(stayed[col]),
        }

    return {
        "avg_cashback":          _pair("CashbackAmount"),
        "avg_orders":            _pair("OrderCount"),
        "avg_order_hike_pct":    _pair("OrderAmountHikeFromlastYear"),
        "avg_app_hours":         _pair("HourSpendOnApp"),
        "avg_days_since_order":  _pair("DaySinceLastOrder"),
        "avg_warehouse_to_home": _pair("WarehouseToHome"),
        "avg_coupons_used":      _pair("CouponUsed"),
        "avg_num_devices":       _pair("NumberOfDeviceRegistered"),
        "avg_complain_rate": {
            # Complain is 0/1; express as a percentage of each group
            "churned": _safe_round(churned["Complain"].mean() * 100),
            "stayed":  _safe_round(stayed["Complain"].mean() * 100),
        },
    }


def compute_feature_importance() -> list[dict]:
    """
    Load the trained Random Forest model and extract real feature importances.
    
    Returns a sorted list of {feature, importance, importance_pct} dicts.
    Falls back to empty list if model not found.
    """
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "..", "model", "churn_model.pkl")
        encoder_path = os.path.join(base_dir, "..", "model", "churn_encoder.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(encoder_path):
            return []
        
        model = joblib.load(model_path)
        artifacts = joblib.load(encoder_path)
        feature_names = artifacts.get("feature_names", [])
        
        if not hasattr(model, "feature_importances_"):
            return []
        
        importances = model.feature_importances_
        total = sum(importances)
        
        # Create sorted list of feature importance dicts
        importance_data = [
            {
                "feature": name,
                "importance": round(float(imp), 4),
                "importance_pct": round(float(imp / total * 100), 2) if total > 0 else 0.0
            }
            for name, imp in zip(feature_names, importances)
        ]
        
        # Sort by importance descending
        importance_data.sort(key=lambda x: x["importance"], reverse=True)
        
        return importance_data
    
    except Exception:
        return []


def compute_model_performance() -> dict:
    """
    Return the Random Forest model's performance metrics.
    These are hardcoded from the training results for display purposes.
    """
    return {
        "model_name": "Random Forest",
        "roc_auc": 0.9986,
        "f1_score": 0.9421,
        "accuracy": 0.9796,
        "precision": 0.9034,
        "recall": 0.9842,
        "false_positives": 20,
        "false_negatives": 3,
        "total_test_samples": 1126,
        "training_time_seconds": 1.8,
        "threshold": 0.32,
    }


# ── Time-series: monthly churn trend ────────────────────────────────────────

def compute_monthly_trend(df: pd.DataFrame, rolling_window: int = 3) -> dict:
    """
    Build a time-series of churn behaviour across each Tenure month (0–60).

    Rationale
    ---------
    The dataset has no calendar date column. `Tenure` (months a customer has
    been on the platform) serves as the lifecycle time axis.  At Tenure = T,
    customers who churned show the *churn hazard* — how likely a customer is
    to leave at exactly that lifecycle stage.  This produces a genuine
    retention time-series that answers: "When do customers leave?"

    Algorithm
    ---------
    1. Drop rows with null Tenure.
    2. Group by integer Tenure month.
    3. For each month: count total, churned, stayed; compute raw churn_rate.
    4. Apply a centred rolling average (window=rolling_window) for smoothing.
    5. Identify the peak-hazard month (among months with ≥ 10 customers).
    6. Identify the first month where rolling_rate < 20% (≥10 customers) —
       after this point retention has "stabilised".

    Returns
    -------
    {
      monthly_trend         : list of per-month point dicts
      rolling_window        : int used for smoothing
      peak_churn_month      : {month, churn_rate}
      stabilizes_after_month: int
    }

    Each point dict:
      month        int    Tenure month (0–60)
      churned      int    customers who churned at this month
      stayed       int    customers who stayed
      total        int    cohort size
      churn_rate   float  raw churn % this month
      rolling_rate float  smoothed rolling average %
    """
    tdf = df.dropna(subset=["Tenure"]).copy()
    tdf["Month"] = tdf["Tenure"].astype(int)

    grouped = (
        tdf.groupby("Month")
        .agg(total=("Churn", "count"), churned=("Churn", "sum"))
        .reset_index()
        .sort_values("Month")
    )
    grouped["stayed"]      = grouped["total"] - grouped["churned"]
    grouped["churn_rate"]  = (
        grouped["churned"] / grouped["total"].clip(lower=1) * 100
    ).round(2)

    # Centred rolling average for smoother trend line
    grouped["rolling_rate"] = (
        grouped["churn_rate"]
        .rolling(window=rolling_window, center=True, min_periods=1)
        .mean()
        .round(2)
    )

    # Peak churn month — only consider months with ≥ 10 customers
    sig = grouped[grouped["total"] >= 10]
    if not sig.empty:
        peak_row = sig.loc[sig["churn_rate"].idxmax()]
        peak = {
            "month":      int(peak_row["Month"]),
            "churn_rate": float(peak_row["churn_rate"]),
        }
    else:
        peak = {"month": 0, "churn_rate": 0.0}

    # Stabilises after = first month where rolling rate < 20% and cohort ≥ 10
    stable = grouped[(grouped["rolling_rate"] < 20) & (grouped["total"] >= 10)]
    stabilizes_after = int(stable["Month"].iloc[0]) if not stable.empty else 60

    records = [
        {
            "month":        int(r["Month"]),
            "churned":      int(r["churned"]),
            "stayed":       int(r["stayed"]),
            "total":        int(r["total"]),
            "churn_rate":   float(r["churn_rate"]),
            "rolling_rate": float(r["rolling_rate"]),
        }
        for _, r in grouped.iterrows()
    ]

    return {
        "monthly_trend":          records,
        "rolling_window":         rolling_window,
        "peak_churn_month":       peak,
        "stabilizes_after_month": stabilizes_after,
    }


# ── Combined builders (called by FastAPI endpoints) ──────────────────────────

def build_analytics_response(df: pd.DataFrame) -> dict:
    """
    Combine all grouping aggregations into the GET /analytics payload.

    Groups included:
      overview + 7 categorical breakdowns + tenure bands +
      avg_days_since_last_order + kpi_comparison + 
      feature_importance + model_performance
    """
    return {
        **compute_overview(df),
        **compute_churn_by_group(df),
        **compute_tenure_bands(df),
        "avg_days_since_last_order": {
            "churned": _safe_mean(df[df["Churn"] == 1]["DaySinceLastOrder"]),
            "stayed":  _safe_mean(df[df["Churn"] == 0]["DaySinceLastOrder"]),
        },
        "kpi_comparison": compute_kpi_comparison(df),
        "feature_importance": compute_feature_importance(),
        "model_performance": compute_model_performance(),
    }


def build_trends_response(df: pd.DataFrame) -> dict:
    """Full GET /analytics/trends response payload."""
    return compute_monthly_trend(df)
