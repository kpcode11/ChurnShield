"""
Layer 1 + Layer 2: Data Cleaning → Model Training → Save Artifacts
Trains an XGBoost classifier on the E-Commerce Customer Churn dataset.
"""

import os
import sys
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from xgboost import XGBClassifier
import joblib

warnings.filterwarnings("ignore")

# ──────────────────── PATHS ────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "ecommerce_churn.csv")
MODEL_PATH = os.path.join(BASE_DIR, "churn_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "churn_encoder.pkl")

# ──────────────────── LAYER 1: DATA CLEANING ────────────────────

def load_and_clean(path: str) -> pd.DataFrame:
    """Load CSV, clean missing values, encode categorical features."""
    df = pd.read_csv(path)
    print(f"Loaded dataset: {df.shape[0]} rows × {df.shape[1]} columns")

    # Drop CustomerID — irrelevant for prediction
    if "CustomerID" in df.columns:
        df.drop(columns=["CustomerID"], inplace=True)

    # Fill numeric missing values with median
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col].fillna(median_val, inplace=True)
            print(f"  Filled {col} NaNs with median = {median_val}")

    # Fill categorical missing values with mode
    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        if df[col].isnull().sum() > 0:
            mode_val = df[col].mode()[0]
            df[col].fillna(mode_val, inplace=True)
            print(f"  Filled {col} NaNs with mode = {mode_val}")

    return df


def encode_features(df: pd.DataFrame):
    """Label-encode all categorical columns. Returns DataFrame + dict of encoders."""
    encoders = {}
    cat_cols = df.select_dtypes(include=["object"]).columns
    for col in cat_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"  Encoded {col}: {list(le.classes_)}")
    return df, encoders


# ──────────────────── LAYER 2: MODEL TRAINING ────────────────────

def train_model(df: pd.DataFrame):
    """Split, train XGBoost, evaluate, return model."""
    target = "Churn"
    X = df.drop(columns=[target])
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\nTrain: {X_train.shape[0]}  |  Test: {X_test.shape[0]}")

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        use_label_encoder=False,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n── Evaluation Metrics ──")
    print(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"  Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"  F1 Score:  {f1_score(y_test, y_pred):.4f}")

    # Feature importance
    feature_importance = sorted(
        zip(X.columns, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    print("\n── Top 5 Features ──")
    for feat, imp in feature_importance[:5]:
        print(f"  {feat}: {imp:.4f}")

    return model, list(X.columns)


# ──────────────────── MAIN ────────────────────

def main():
    print("=" * 50)
    print("  ChurnShield — Model Training Pipeline")
    print("=" * 50)

    # Step 1: Ensure dataset exists
    if not os.path.exists(DATA_PATH):
        print("\nDataset not found. Downloading...")
        sys.path.insert(0, os.path.join(BASE_DIR, ".."))
        from data.download_dataset import download_dataset
        download_dataset()

    # Step 2: Clean data
    print("\n── Layer 1: Data Cleaning ──")
    df = load_and_clean(DATA_PATH)

    # Step 3: Encode
    print("\n── Encoding Features ──")
    df, encoders = encode_features(df)

    # Step 4: Train
    print("\n── Layer 2: Model Training ──")
    model, feature_names = train_model(df)

    # Step 5: Save artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump({"encoders": encoders, "feature_names": feature_names}, ENCODER_PATH)
    print(f"\nModel saved   → {MODEL_PATH}")
    print(f"Encoders saved → {ENCODER_PATH}")
    print("\n✅ Training complete!")


if __name__ == "__main__":
    main()
