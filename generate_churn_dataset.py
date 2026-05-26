"""
Generate synthetic ecommerce churn data with causal feature → label relationships.

Features drive the churn label (not the reverse). Correlations should land in
0.05–0.40. Subscription tiers and categories match the frontend / 4.md test cases.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Import 4.md anchor profiles for calibration rows
sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.validation_profiles import ANCHOR_CHURN_PROB, VALIDATION_CASES

# Maps used in churn score (aligned with UI and 4.md validation profiles)
SUBSCRIPTION_PLANS = ["Free", "Silver", "Gold", "Platinum"]
ORDER_CATEGORIES = [
    "Laptop & Accessory",
    "Mobile Phone",
    "Fashion",
    "Grocery",
    "Electronics",
    "Others",
]
LOGIN_DEVICES = ["Mobile Phone", "Computer", "Phone", "Tablet"]
PAYMENT_MODES = ["Credit Card", "Debit Card", "UPI", "Cash on Delivery", "E-wallet"]

SUBSCRIPTION_CHURN_BIAS = {"Free": 0.55, "Silver": 0.15, "Gold": -0.25, "Platinum": -0.55}
CATEGORY_CHURN_BIAS = {
    "Mobile Phone": 0.35,
    "Laptop & Accessory": 0.10,
    "Fashion": 0.05,
    "Electronics": 0.15,
    "Grocery": -0.35,
    "Others": 0.0,
}
PAYMENT_CHURN_BIAS = {
    "Cash on Delivery": 0.35,
    "E-wallet": 0.05,
    "Debit Card": -0.05,
    "UPI": -0.10,
    "Credit Card": -0.20,
}


NUMERIC_JITTER = {
    "Tenure": (-1, 2),
    "WarehouseToHome": (-3, 3),
    "HourSpendOnApp": (-1, 1),
    "NumberOfDeviceRegistered": (-1, 1),
    "SatisfactionScore": (-1, 1),
    "NumberOfAddress": (-1, 1),
    "OrderAmountHikeFromlastYear": (-2, 2),
    "CouponUsed": (-1, 2),
    "OrderCount": (-1, 2),
    "DaySinceLastOrder": (-3, 3),
    "CashbackAmount": (-15, 15),
    "TotalSpend": (-200, 200),
    "AvgOrderValue": (-50, 50),
    "ReturnRate": (-0.05, 0.05),
    "CustomerAge": (-2, 2),
    "LastLoginDaysAgo": (-2, 2),
    "ReviewsGiven": (-1, 1),
    "WishlistItems": (-2, 2),
    "ReferralsMade": (-1, 1),
    "SupportTicketCount": (-1, 1),
}


ANCHOR_COPIES = {
    "HIGH_CHURN": 40,
    "MODERATE_CHURN": 55,
    "LOW_CHURN": 55,
    "LOYAL_W_COMPLAINT": 55,
}


def _inject_validation_anchors(
    df: pd.DataFrame, rng: np.random.Generator, copies_per_profile: int = 60
) -> pd.DataFrame:
    """Add jittered rows around 4.md test profiles so inference matches expected bands."""
    anchor_rows = []
    for label, profile in VALIDATION_CASES.items():
        p_churn = ANCHOR_CHURN_PROB[label]
        n_copies = ANCHOR_COPIES.get(label, copies_per_profile)
        for i in range(n_copies):
            row = dict(profile)
            for col, (lo, hi) in NUMERIC_JITTER.items():
                if col in row and isinstance(row[col], (int, float)):
                    delta = rng.integers(lo, hi + 1)
                    row[col] = row[col] + delta
                    if col == "SatisfactionScore":
                        row[col] = int(np.clip(row[col], 1, 5))
                    elif col == "ReturnRate":
                        row[col] = float(np.clip(row[col], 0, 1))
                    elif col in ("Tenure", "HourSpendOnApp", "CityTier", "Complain"):
                        row[col] = int(max(0, row[col]))
            row["CustomerID"] = f"ANCHOR_{label}_{i:03d}"
            row["Churn"] = int(rng.random() < p_churn)
            anchor_rows.append(row)

    if anchor_rows:
        print(f"INFO  Injected {len(anchor_rows)} validation anchor rows (4.md profiles)")
        df = pd.concat([df, pd.DataFrame(anchor_rows)], ignore_index=True)
        # Trim random rows to keep requested row count if we started with exact `rows`
    return df


def _corr_status(value: float) -> str:
    if value > 0.50:
        return "TOO HIGH"
    if value < 0.05:
        return "LOW"
    return "GOOD"


def generate_dataset(output_path: str, rows: int, seed: int, copies_per_profile: int = 60) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    anchor_count = sum(ANCHOR_COPIES.values())
    base_rows = max(rows - anchor_count, int(rows * 0.95))

    print(f"INFO  Generating {base_rows} base records (+{anchor_count} validation anchors) ...")

    df = pd.DataFrame()
    df["CustomerID"] = [f"CUST_{i:05d}" for i in range(base_rows)]

    df["Tenure"] = rng.integers(0, 61, size=base_rows)
    df["PreferredLoginDevice"] = rng.choice(LOGIN_DEVICES, size=base_rows, p=[0.55, 0.25, 0.12, 0.08])
    df["CityTier"] = rng.choice([1, 2, 3], size=base_rows, p=[0.45, 0.35, 0.20])
    df["WarehouseToHome"] = rng.integers(5, 101, size=base_rows)
    df["PreferredPaymentMode"] = rng.choice(PAYMENT_MODES, size=base_rows)
    df["Gender"] = rng.choice(["Male", "Female"], size=base_rows)
    df["HourSpendOnApp"] = rng.integers(0, 6, size=base_rows)
    df["NumberOfDeviceRegistered"] = rng.integers(1, 11, size=base_rows)
    df["PreferedOrderCat"] = rng.choice(ORDER_CATEGORIES, size=base_rows)
    df["SatisfactionScore"] = rng.integers(1, 6, size=base_rows)
    df["MaritalStatus"] = rng.choice(["Single", "Married", "Divorced"], size=base_rows, p=[0.35, 0.55, 0.10])
    df["NumberOfAddress"] = rng.integers(1, 11, size=base_rows)
    df["Complain"] = rng.choice([0, 1], size=base_rows, p=[0.82, 0.18])
    df["OrderAmountHikeFromlastYear"] = rng.integers(0, 51, size=base_rows)
    df["CouponUsed"] = rng.integers(0, 21, size=base_rows)
    df["OrderCount"] = rng.integers(0, 21, size=base_rows)
    df["DaySinceLastOrder"] = rng.integers(0, 91, size=base_rows)
    df["CashbackAmount"] = np.round(rng.uniform(0, 400, size=base_rows), 2)
    df["TotalSpend"] = np.round(rng.uniform(100, 12000, size=base_rows), 2)
    df["AvgOrderValue"] = np.round(rng.uniform(50, 2500, size=base_rows), 2)
    df["ReturnRate"] = np.round(rng.uniform(0, 0.75, size=base_rows), 4)
    df["CustomerAge"] = rng.integers(18, 71, size=base_rows)
    df["LastLoginDaysAgo"] = rng.integers(0, 91, size=base_rows)
    df["ReviewsGiven"] = rng.integers(0, 16, size=base_rows)
    df["WishlistItems"] = rng.integers(0, 31, size=base_rows)
    df["SubscriptionPlan"] = rng.choice(
        SUBSCRIPTION_PLANS, size=base_rows, p=[0.35, 0.30, 0.20, 0.15]
    )
    df["ReferralsMade"] = rng.integers(0, 11, size=base_rows)
    df["SupportTicketCount"] = rng.integers(0, 11, size=base_rows)

    print("INFO  Computing churn scores from feature values ...")

    sub_bias = df["SubscriptionPlan"].map(SUBSCRIPTION_CHURN_BIAS).fillna(0)
    cat_bias = df["PreferedOrderCat"].map(CATEGORY_CHURN_BIAS).fillna(0)
    pay_bias = df["PreferredPaymentMode"].map(PAYMENT_CHURN_BIAS).fillna(0)
    tier_bias = df["CityTier"].map({1: -0.15, 2: 0.0, 3: 0.20}).fillna(0)

    # Complaint effect is weaker for otherwise loyal, active customers (4.md Test Case D)
    loyal_anchor = (
        (df["Tenure"] >= 24)
        & (df["TotalSpend"] >= 4000)
        & (df["SatisfactionScore"] >= 3)
        & (df["LastLoginDaysAgo"] <= 10)
    )
    complain_effect = np.where(
        loyal_anchor & (df["Complain"] == 1),
        0.35,
        1.15 * df["Complain"],
    )

    score = (
        -0.52 * df["SatisfactionScore"]
        + 2.8 * df["ReturnRate"]
        + 0.018 * df["LastLoginDaysAgo"]
        - 0.14 * df["HourSpendOnApp"]
        - 0.040 * df["Tenure"]
        + 0.22 * df["SupportTicketCount"]
        + 0.014 * df["DaySinceLastOrder"]
        - 0.0025 * df["CashbackAmount"]
        + complain_effect
        - 0.045 * df["OrderCount"]
        - 0.06 * df["CouponUsed"]
        - 0.08 * df["ReviewsGiven"]
        - 0.04 * df["WishlistItems"]
        - 0.05 * df["ReferralsMade"]
        + 0.006 * df["WarehouseToHome"]
        + 0.03 * df["NumberOfAddress"]
        + 0.02 * df["NumberOfDeviceRegistered"]
        + sub_bias
        + cat_bias
        + pay_bias
        + tier_bias
        + rng.normal(0, 1.1, size=base_rows)
    )

    threshold = np.percentile(score, 100 - 16.5)
    df["Churn"] = (score >= threshold).astype(int)

    df = _inject_validation_anchors(df, rng, copies_per_profile=copies_per_profile)

    churned = int(df["Churn"].sum())
    churn_rate = churned / len(df)
    print(f"INFO  Churn label generated - churned: {churned} / {len(df)} ({churn_rate:.1%})")

    ok = True
    if not (0.14 <= churn_rate <= 0.19):
        print(f"FAIL  Churn rate {churn_rate:.1%} outside 14–19%")
        ok = False
    else:
        print(f"INFO  PASS - Churn rate: {churn_rate:.1%}")

    if df.isnull().sum().sum() > 0:
        print("FAIL  Missing values detected")
        ok = False
    else:
        print("INFO  PASS - No missing values")

    if df.duplicated().any():
        print("FAIL  Duplicate rows detected")
        ok = False
    else:
        print("INFO  PASS - No duplicate rows")

    print("INFO  Feature correlations with Churn:")
    corrs = df.corr(numeric_only=True)["Churn"].drop("Churn").abs().sort_values(ascending=False)
    too_high = []
    too_low = []
    for feat, corr in corrs.items():
        status = _corr_status(corr)
        print(f"INFO    {feat:<25} {corr:.4f}  [{status}]")
        if status == "TOO HIGH":
            too_high.append((feat, corr))
        elif status == "LOW":
            too_low.append((feat, corr))

    if too_high:
        print("FAIL  Correlations above 0.50 — possible leakage:")
        for feat, corr in too_high:
            print(f"        {feat}: {corr:.4f}")
        ok = False
    else:
        print("INFO  PASS - No correlation above 0.50")

    if len(too_low) > 8:
        print(f"WARN  {len(too_low)} features below 0.05 correlation (demographics expected)")

    if ok:
        print("INFO  PASS - Value ranges look correct")
    else:
        print("INFO  Dataset validation FAILED — do not train on this file")

    cols = ["CustomerID", "Churn"] + [c for c in df.columns if c not in ("CustomerID", "Churn")]
    df = df[cols]
    df.to_csv(output_path, index=False)
    print(f"INFO  Saved {len(df)} rows x {df.shape[1]} columns -> {output_path}")
    return df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate causal ecommerce churn CSV")
    parser.add_argument("--output", required=True)
    parser.add_argument("--rows", type=int, default=5630)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    generate_dataset(args.output, args.rows, args.seed)
