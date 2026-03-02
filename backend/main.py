"""
Layer 3 — FastAPI Backend
All six endpoints for ChurnShield.
"""

import os
import io
import sys
import math
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional


def _clean_for_json(obj):
    """Recursively replace NaN/Inf with None so JSON serialization works."""
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_for_json(v) for v in obj]
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return 0.0
    return obj

# Ensure project root is on path so we can import sibling packages
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.predictor import predict_single, predict_bulk
from backend.suggestions import get_suggestion
from backend.revenue import calculate_revenue_impact
from backend.message_generator import generate_message

# ──────────────────── DATA PATH ────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "ecommerce_churn.csv")

# ──────────────────── APP ────────────────────
app = FastAPI(
    title="ChurnShield API",
    description="Customer Churn Prediction & Retention Intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────── SCHEMAS ────────────────────

class CustomerInput(BaseModel):
    Tenure: Optional[float] = 12
    PreferredLoginDevice: Optional[str] = "Mobile Phone"
    CityTier: Optional[int] = 1
    WarehouseToHome: Optional[float] = 15
    PreferredPaymentMode: Optional[str] = "Debit Card"
    Gender: Optional[str] = "Male"
    HourSpendOnApp: Optional[float] = 3
    NumberOfDeviceRegistered: Optional[int] = 3
    PreferedOrderCat: Optional[str] = "Laptop & Accessory"
    SatisfactionScore: Optional[int] = 3
    MaritalStatus: Optional[str] = "Single"
    NumberOfAddress: Optional[int] = 2
    Complain: Optional[int] = 0
    OrderAmountHikeFromlastYear: Optional[float] = 15
    CouponUsed: Optional[float] = 1
    OrderCount: Optional[float] = 2
    DaySinceLastOrder: Optional[float] = 5
    CashbackAmount: Optional[float] = 150


class RevenueInput(BaseModel):
    at_risk_customers: int
    avg_order_value: float
    coupon_amount: float
    retention_rate: float  # percentage, e.g. 30


class SuggestInput(BaseModel):
    DaySinceLastOrder: Optional[float] = 5
    SatisfactionScore: Optional[int] = 3
    Complain: Optional[int] = 0
    CashbackAmount: Optional[float] = 150
    Tenure: Optional[float] = 12


class MessageInput(BaseModel):
    customer_segment: str
    suggestion: str
    tone: Optional[str] = "warm, concise"


# ──────────────────── ENDPOINTS ────────────────────

# ---------- 1. POST /predict — Single Customer Prediction ----------
@app.post("/predict")
def predict_customer(customer: CustomerInput):
    """Module 1: Predict churn for a single customer."""
    data = customer.dict()
    result = predict_single(data)
    return result


# ---------- 2. POST /bulk — Bulk CSV Prediction ----------
@app.post("/bulk")
async def bulk_predict(file: UploadFile = File(...)):
    """Module 2: Upload CSV, returns scored Excel file."""
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    result_df = predict_bulk(df)

    # Write to Excel in memory
    output = io.BytesIO()
    result_df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=churnshield_results.xlsx"},
    )


# ---------- 3. GET /analytics — Live Analytics Dashboard Data ----------
@app.get("/analytics")
def get_analytics():
    """Module 3: Aggregated analytics for the dashboard."""
    df = pd.read_csv(DATA_PATH)

    total = len(df)
    churned = int(df["Churn"].sum())
    overall_churn_rate = round(churned / total * 100, 2)

    # Churn rate by CityTier
    churn_by_city = (
        df.groupby("CityTier")["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    # Churn rate by Gender
    churn_by_gender = (
        df.groupby("Gender")["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    # Churn rate by SatisfactionScore
    churn_by_satisfaction = (
        df.groupby("SatisfactionScore")["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    # Churn rate by PreferredLoginDevice
    churn_by_device = (
        df.groupby("PreferredLoginDevice")["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    # Avg DaySinceLastOrder: churned vs stayed
    avg_days_churned_raw = df[df["Churn"] == 1]["DaySinceLastOrder"].mean()
    avg_days_stayed_raw = df[df["Churn"] == 0]["DaySinceLastOrder"].mean()
    avg_days_churned = round(float(avg_days_churned_raw), 2) if not pd.isna(avg_days_churned_raw) else 0.0
    avg_days_stayed = round(float(avg_days_stayed_raw), 2) if not pd.isna(avg_days_stayed_raw) else 0.0

    # Monthly churn trend (using Tenure as proxy for months)
    tenure_bins = [0, 6, 12, 18, 24, 36, 48, 60, 100]
    tenure_labels = ["0-6", "7-12", "13-18", "19-24", "25-36", "37-48", "49-60", "60+"]
    df["TenureBucket"] = pd.cut(df["Tenure"], bins=tenure_bins, labels=tenure_labels)
    churn_by_tenure = (
        df.groupby("TenureBucket", observed=False)["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    # Churn by PreferedOrderCat
    churn_by_category = (
        df.groupby("PreferedOrderCat")["Churn"]
        .mean()
        .mul(100)
        .round(2)
        .to_dict()
    )

    result = {
        "total_customers": total,
        "churned_customers": churned,
        "overall_churn_rate": overall_churn_rate,
        "churn_by_city_tier": {str(k): v for k, v in churn_by_city.items()},
        "churn_by_gender": churn_by_gender,
        "churn_by_satisfaction": {str(k): v for k, v in churn_by_satisfaction.items()},
        "churn_by_device": churn_by_device,
        "avg_days_since_last_order": {
            "churned": avg_days_churned,
            "stayed": avg_days_stayed,
        },
        "churn_by_tenure": churn_by_tenure,
        "churn_by_category": churn_by_category,
    }
    return _clean_for_json(result)


# ---------- 4. POST /revenue — Revenue Impact Calculator ----------
@app.post("/revenue")
def revenue_impact(data: RevenueInput):
    """Module 4: Calculate revenue at risk and campaign ROI."""
    return calculate_revenue_impact(
        at_risk_customers=data.at_risk_customers,
        avg_order_value=data.avg_order_value,
        coupon_amount=data.coupon_amount,
        retention_rate=data.retention_rate,
    )


# ---------- 5. POST /suggest — Smart Retention Suggestion ----------
@app.post("/suggest")
def suggest_retention(customer: SuggestInput):
    """Module 5: Get a rule-based retention suggestion."""
    return get_suggestion(customer.dict())


# ---------- 6. POST /message — AI Message Generator ----------
@app.post("/message")
def generate_retention_message(data: MessageInput):
    """Module 6: Generate a personalised retention message."""
    return generate_message(
        customer_segment=data.customer_segment,
        suggestion=data.suggestion,
        tone=data.tone,
    )


# ──────────────────── HEALTH CHECK ────────────────────
@app.get("/")
def root():
    return {"status": "ChurnShield API is running", "version": "1.0.0"}


# ──────────────────── RUN ────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
