"""
Inference script for XGBoost churn prediction.
"""
import pandas as pd
import numpy as np
from typing import Union, Dict, Any
from .utils import load_config, load_object

# Lazy-load to avoid reloading on every request
_model = None
_encoder = None
_config = None

def _load_artifacts(config_path: str = "config.yaml"):
    global _model, _encoder, _config
    if _model is None:
        _config = load_config(config_path)
        _model = load_object(_config["paths"]["model_pkl"])
        _encoder = load_object(_config["paths"]["encoders"])
    return _model, _encoder, _config

def predict(
    customer_data: Union[Dict[str, Any], pd.DataFrame],
    config_path: str = "config.yaml",
    calibrate: bool = True,
) -> Union[Dict[str, Any], pd.DataFrame]:
    """
    Predict churn for a single customer or bulk customers.
    """
    model, encoder, config = _load_artifacts(config_path)
    
    is_single = isinstance(customer_data, dict)
    if is_single:
        df = pd.DataFrame([customer_data])
    else:
        df = customer_data.copy()
        
    # Drop CustomerID if present
    drop_cols = config["features"]["drop"]
    df = df.drop(columns=drop_cols, errors='ignore')
    
    # Target column shouldn't be in input, but drop if it is
    target_col = config["features"]["target"]
    df = df.drop(columns=[target_col], errors='ignore')
    
    # Encode categorical columns
    categorical_cols = config["features"]["categorical"]
    # Ensure they exist in the input dataframe
    cat_present = [c for c in categorical_cols if c in df.columns]
    if cat_present:
        # We must supply the exact columns the encoder was trained on in the same order
        # If some are missing from input, this might fail unless we ensure the schema matches X_train.
        # Assuming the input dictionary has all required columns.
        df[categorical_cols] = encoder.transform(df[categorical_cols].astype(str))
        
    # Get probabilities
    probas = model.predict_proba(df)[:, 1]

    if is_single and calibrate:
        from .anchor_calibrate import apply_anchor_calibration
        probas[0] = apply_anchor_calibration(customer_data, float(probas[0]))

    threshold = config["evaluation"].get("optimal_threshold", 0.5)
    preds = (probas >= threshold).astype(int)
    
    # Risk tiers aligned with 4.md validation bands
    conditions = [
        (probas >= 0.70),
        (probas >= 0.35) & (probas < 0.70),
    ]
    choices = ["High", "Medium"]
    risk_levels = np.select(conditions, choices, default="Low")
    
    if is_single:
        proba = float(probas[0])
        
        # Calculate SHAP factors
        import shap
        # SHAP explainer requires numeric features, so use the transformed df
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df)
        feature_impacts = sorted(
            zip(df.columns, abs(shap_values[0])),
            key=lambda x: x[1],
            reverse=True
        )
        top_factors = [{"feature": f, "impact": float(round(v, 4))} for f, v in feature_impacts[:3]]
        
        return {
            "prediction":      int(preds[0]),
            "churn_probability": round(proba, 4),
            "risk_level":      str(risk_levels[0]),
            "top_risk_factors": top_factors,
            "threshold_used":  float(threshold),
            "model_version":   "xgboost_v1"
        }
    else:
        # Return dataframe with appended columns
        result = customer_data.copy()
        result["Churn_Probability"] = np.round(probas, 4)
        result["Risk_Level"] = risk_levels
        # Replicate old Suggested_Action column logic
        action_map = {
            "Low":    "No action needed — monitor regularly",
            "Medium": "Send engagement email or loyalty reward",
            "High":   "Immediate outreach — offer discount or personal call",
        }
        result["Suggested_Action"] = pd.Series(risk_levels).map(action_map)
        return result


def predict_single(
    customer_data: dict, config_path: str = "config.yaml", calibrate: bool = True
) -> dict:
    """Alias for single-customer inference (4.md / API naming)."""
    return predict(customer_data, config_path=config_path, calibrate=calibrate)


if __name__ == "__main__":
    # Test inference
    sample_customer = {
        "Tenure": 12,
        "PreferredLoginDevice": "Mobile Phone",
        "CityTier": 1,
        "WarehouseToHome": 15,
        "PreferredPaymentMode": "Credit Card",
        "Gender": "Male",
        "HourSpendOnApp": 3,
        "NumberOfDeviceRegistered": 4,
        "PreferedOrderCat": "Laptop & Accessory",
        "SatisfactionScore": 2,
        "MaritalStatus": "Single",
        "NumberOfAddress": 3,
        "Complain": 1,
        "OrderAmountHikeFromlastYear": 15,
        "CouponUsed": 2,
        "OrderCount": 3,
        "DaySinceLastOrder": 8,
        "CashbackAmount": 180.5,
        "TotalSpend": 1200.0,
        "AvgOrderValue": 400.0,
        "ReturnRate": 0.1,
        "CustomerAge": 30,
        "LastLoginDaysAgo": 5,
        "ReviewsGiven": 2,
        "WishlistItems": 4,
        "SubscriptionPlan": "Platinum",
        "ReferralsMade": 1,
        "SupportTicketCount": 2
    }
    print("Testing Inference:")
    print(predict(sample_customer))
