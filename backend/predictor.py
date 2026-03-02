"""
Module 1 — Prediction Logic
Loads the trained model + encoders and provides prediction functions.
"""

import os
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "churn_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "..", "model", "churn_encoder.pkl")

# Load once at module import
_model = None
_artifacts = None


def _load_model():
    global _model, _artifacts
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        _artifacts = joblib.load(ENCODER_PATH)
    return _model, _artifacts


def get_feature_names():
    """Return the feature names the model was trained on."""
    _, artifacts = _load_model()
    return artifacts["feature_names"]


def _encode_input(data: dict) -> np.ndarray:
    """Encode a single customer dict into a NumPy array matching training features."""
    model, artifacts = _load_model()
    encoders = artifacts["encoders"]
    feature_names = artifacts["feature_names"]

    row = {}
    for feat in feature_names:
        val = data.get(feat)
        if feat in encoders:
            # Categorical — encode using saved LabelEncoder
            le = encoders[feat]
            if val in le.classes_:
                row[feat] = le.transform([val])[0]
            else:
                # Unknown category — use 0 as fallback
                row[feat] = 0
        else:
            # Numeric
            row[feat] = float(val) if val is not None else 0.0

    arr = np.array([[row[f] for f in feature_names]])
    return arr


def predict_single(data: dict) -> dict:
    """
    Predict churn for a single customer.
    Returns: { churn: 0|1, probability: float, risk: str }
    """
    model, _ = _load_model()
    X = _encode_input(data)
    prediction = int(model.predict(X)[0])
    proba = float(model.predict_proba(X)[0][1])  # probability of churn (class 1)

    # Risk classification
    if proba < 0.30:
        risk = "Low"
    elif proba < 0.60:
        risk = "Medium"
    else:
        risk = "High"

    return {
        "churn": prediction,
        "probability": round(proba, 4),
        "risk": risk,
    }


def predict_bulk(df: pd.DataFrame) -> pd.DataFrame:
    """
    Predict churn for an entire DataFrame.
    Adds columns: Churn_Probability, Risk_Level, Suggested_Action
    """
    model, artifacts = _load_model()
    encoders = artifacts["encoders"]
    feature_names = artifacts["feature_names"]

    # Make a copy to avoid mutating original
    df_proc = df.copy()

    # Drop CustomerID if present
    if "CustomerID" in df_proc.columns:
        customer_ids = df_proc["CustomerID"].copy()
        df_proc.drop(columns=["CustomerID"], inplace=True)
    else:
        customer_ids = None

    # Drop Churn column if present (we're predicting it)
    if "Churn" in df_proc.columns:
        df_proc.drop(columns=["Churn"], inplace=True)

    # Fill numeric NaNs with median
    numeric_cols = df_proc.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df_proc[col].isnull().sum() > 0:
            df_proc[col].fillna(df_proc[col].median(), inplace=True)

    # Fill categorical NaNs with mode
    cat_cols = df_proc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        if df_proc[col].isnull().sum() > 0:
            df_proc[col].fillna(df_proc[col].mode()[0], inplace=True)

    # Encode categoricals
    for col in cat_cols:
        if col in encoders:
            le = encoders[col]
            df_proc[col] = df_proc[col].apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else 0
            )
        else:
            # Unknown column — try label encoding on the fly
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            df_proc[col] = le.fit_transform(df_proc[col].astype(str))

    # Ensure only training features are present, in correct order
    for feat in feature_names:
        if feat not in df_proc.columns:
            df_proc[feat] = 0
    df_proc = df_proc[feature_names]

    # Predict
    probas = model.predict_proba(df_proc)[:, 1]

    # Build result DataFrame
    result = df.copy()
    result["Churn_Probability"] = np.round(probas, 4)
    result["Risk_Level"] = pd.cut(
        probas,
        bins=[-0.01, 0.30, 0.60, 1.01],
        labels=["Low", "Medium", "High"],
    )
    result["Suggested_Action"] = result["Risk_Level"].map({
        "Low": "No action needed — monitor regularly",
        "Medium": "Send engagement email or loyalty reward",
        "High": "Immediate outreach — offer discount or personal call",
    })

    return result
