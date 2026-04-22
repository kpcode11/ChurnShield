"""
Prediction Logic — ChurnShield
Loads the trained model + artifact bundle and provides single/bulk inference.

Artifact bundle (churn_encoder.pkl) expected keys:
  encoders         {col: LabelEncoder}      — categorical encoders
  feature_names    [str]                    — model input order
  impute_values    {col: median | mode}     — training-set fill values (no leakage)
  train_ranges     {col: (min, max)}        — numeric bounds for clipping outliers
  scale_pos_weight float                    — class imbalance ratio (reference)
  best_threshold   float                    — tuned classification threshold
"""

import os
import numpy as np
import pandas as pd
import joblib

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, "..", "model", "churn_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "..", "model", "churn_encoder.pkl")

# Lazy-load once per process
_model     = None
_artifacts = None

# Risk thresholds — adjust here if needed
RISK_LOW_THRESHOLD  = 0.30   # probability < 0.30 → Low
RISK_HIGH_THRESHOLD = 0.60   # probability ≥ 0.60 → High


def _load_model():
    global _model, _artifacts
    if _model is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
            raise FileNotFoundError(
                "Model artifacts not found. Run `python -m model.train_model` first."
            )
        _model     = joblib.load(MODEL_PATH)
        _artifacts = joblib.load(ENCODER_PATH)
    return _model, _artifacts


def get_feature_names() -> list[str]:
    """Return the ordered feature list the model was trained on."""
    _, art = _load_model()
    return art["feature_names"]


# ──────────────────────────────────────────────────────────────────
# Single-row encoding
# ──────────────────────────────────────────────────────────────────

def _encode_input(data: dict) -> np.ndarray:
    """
    Convert a single customer dict → NumPy row for model inference.

    Strategy:
      • Numeric nulls/missing: fill with training-set median (from impute_values)
      • Categorical nulls/missing: fill with training-set mode (from impute_values)
      • Numeric values: clipped to [min, max] from training data (handles outliers)
      • Unknown categories: mapped to the most frequent class (mode index 0)
    """
    _, art = _load_model()
    encoders      = art["encoders"]
    feature_names = art["feature_names"]
    impute        = art.get("impute_values", {})
    ranges        = art.get("train_ranges", {})

    row = {}
    for feat in feature_names:
        val = data.get(feat)

        if feat in encoders:
            # ── Categorical ──────────────────────────────────────
            le = encoders[feat]
            if val is None or (isinstance(val, float) and np.isnan(val)):
                # Use training-mode (index 0 after LabelEncoder sorts classes)
                fill = impute.get(feat, le.classes_[0])
                val  = fill
            val_str = str(val)
            if val_str in le.classes_:
                row[feat] = int(le.transform([val_str])[0])
            else:
                # Unseen category → fallback to training mode
                mode_val = impute.get(feat, le.classes_[0])
                row[feat] = int(le.transform([str(mode_val)])[0])
        else:
            # ── Numeric ─────────────────────────────────────────
            if val is None or (isinstance(val, float) and np.isnan(val)):
                val = impute.get(feat, 0.0)
            val = float(val)

            # Clip to training range if recorded
            if feat in ranges:
                lo, hi = ranges[feat]
                val = max(lo, min(hi, val))

            row[feat] = val

    return np.array([[row[f] for f in feature_names]])


# ──────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────

def predict_single(data: dict) -> dict:
    """
    Predict churn probability for a single customer dict.

    Returns:
      {
        "churn":           int,    # 0 = Stay, 1 = Churn
        "probability":     float,  # raw probability 0.0–1.0  (4 dp)
        "probability_pct": float,  # percentage 0.0–100.0     (1 dp)  ← new
        "risk":            str,    # "Low" | "Medium" | "High"
      }
    """
    model, art = _load_model()
    X         = _encode_input(data)
    proba      = float(model.predict_proba(X)[0][1])   # P(churn)

    threshold  = art.get("best_threshold", 0.5)
    prediction = int(proba >= threshold)

    if proba < RISK_LOW_THRESHOLD:
        risk = "Low"
    elif proba < RISK_HIGH_THRESHOLD:
        risk = "Medium"
    else:
        risk = "High"

    return {
        "churn":           prediction,
        "probability":     round(proba, 4),
        "probability_pct": round(proba * 100, 1),
        "risk":            risk,
    }


def predict_bulk(df: pd.DataFrame) -> pd.DataFrame:
    """
    Predict churn for an entire DataFrame (from an uploaded CSV/Excel).

    Imputation uses the training-set medians/modes stored in the artifact
    bundle — never computes statistics from the uploaded data itself.

    Returns the original DataFrame with three new columns appended:
      Churn_Probability  float     (0–1)
      Risk_Level         str       Low | Medium | High
      Suggested_Action   str       human-readable recommendation
    """
    model, art = _load_model()
    encoders      = art["encoders"]
    feature_names = art["feature_names"]
    impute        = art.get("impute_values", {})
    ranges        = art.get("train_ranges", {})

    df_proc = df.copy()

    # ── Drop non-feature columns ─────────────────────────────────
    for col in ("CustomerID", "Churn"):
        if col in df_proc.columns:
            df_proc = df_proc.drop(columns=[col])

    # ── Fill nulls with training statistics (no leakage) ─────────
    numeric_cols = df_proc.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df_proc[col].isnull().any():
            # Always use training-set median from artifact; fall back to 0 for unknown columns
            fill = impute.get(col, 0.0)
            df_proc[col] = df_proc[col].fillna(fill)

    cat_cols = df_proc.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        if df_proc[col].isnull().any():
            fill = impute.get(col, df_proc[col].mode()[0])
            df_proc[col] = df_proc[col].fillna(fill)

    # ── Clip numeric values to training ranges ───────────────────
    for col in numeric_cols:
        if col in ranges:
            lo, hi = ranges[col]
            df_proc[col] = df_proc[col].clip(lower=lo, upper=hi)

    # ── Encode categoricals ──────────────────────────────────────
    for col in cat_cols:
        if col in encoders:
            le = encoders[col]
            mode_fallback = impute.get(col, le.classes_[0])
            df_proc[col] = df_proc[col].apply(
                lambda x: int(le.transform([str(x)])[0])
                if str(x) in le.classes_
                else int(le.transform([str(mode_fallback)])[0])
            )
        else:
            # Column not seen during training — label-encode on the fly as fallback
            from sklearn.preprocessing import LabelEncoder as _LE
            df_proc[col] = _LE().fit_transform(df_proc[col].astype(str))

    # ── Align to training feature order ─────────────────────────
    for feat in feature_names:
        if feat not in df_proc.columns:
            df_proc[feat] = impute.get(feat, 0)
    df_proc = df_proc[feature_names]

    # ── Inference ────────────────────────────────────────────────
    probas = model.predict_proba(df_proc.values)[:, 1]

    # ── Build output ─────────────────────────────────────────────
    result = df.copy()
    result["Churn_Probability"] = np.round(probas, 4)
    result["Risk_Level"] = pd.cut(
        probas,
        bins=[-0.001, RISK_LOW_THRESHOLD, RISK_HIGH_THRESHOLD, 1.001],
        labels=["Low", "Medium", "High"],
    )
    result["Suggested_Action"] = result["Risk_Level"].map({
        "Low":    "No action needed — monitor regularly",
        "Medium": "Send engagement email or loyalty reward",
        "High":   "Immediate outreach — offer discount or personal call",
    })

    return result
