"""
Layer 1 + Layer 2: Data Cleaning → Model Training → Save Artifacts
Trains a Random Forest classifier on the E-Commerce Customer Churn dataset.

Artifacts saved:
  churn_model.pkl   — trained RandomForestClassifier
  churn_encoder.pkl — {
      "encoders":      {col: LabelEncoder},   # categorical encoders
      "feature_names": [str],                 # model input order
      "impute_values": {col: value},          # training medians/modes for NaN fill
      "train_ranges":  {col: (min, max)},     # numeric ranges for input clipping
      "class_weight":  str,                   # class imbalance handling (saved for reference)
      "best_threshold": float,                # tuned classification threshold
  }
"""

import os
import sys
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report, confusion_matrix
)
from sklearn.ensemble import RandomForestClassifier
import joblib

warnings.filterwarnings("ignore")

# ──────────────────── PATHS ────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(BASE_DIR, "..", "data", "E Commerce Dataset.xlsx")
MODEL_PATH  = os.path.join(BASE_DIR, "churn_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "churn_encoder.pkl")

TARGET = "Churn"
DROP_COLS = ["CustomerID"]          # columns irrelevant for prediction


# ──────────────────────────────────────────────────────────────────
# LAYER 1 — DATA CLEANING
# ──────────────────────────────────────────────────────────────────

def load_and_clean(path: str):
    """
    Load the raw CSV and return a cleaned DataFrame plus imputation
    values computed **only from training data** (to prevent data leakage).

    Steps:
      1. Drop irrelevant identifiers (CustomerID)
      2. Compute median (numeric) and mode (categorical) on training data
      3. Fill NaN values using those statistics
      4. Return cleaned DataFrame and the imputation lookup dict
    """
    # df = pd.read_csv(path)
    df = pd.read_excel(path, sheet_name="E Comm")
    print(f"Loaded: {df.shape[0]:,} rows × {df.shape[1]} columns")

    # 1. Schema Validation & Drop non-predictive columns
    if TARGET not in df.columns:
        raise ValueError(f"Target column '{TARGET}' missing from dataset.")

    df = df.dropna(subset=[TARGET])
    unique_targets = set(df[TARGET].unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(f"Target column '{TARGET}' must be binary (0 and 1). Found: {unique_targets}")

    cols_to_drop = [c for c in DROP_COLS if c in df.columns]
    if cols_to_drop:
        df = df.drop(columns=cols_to_drop)
        print(f"  Dropped: {cols_to_drop}")

    # 2. Separate features & target so imputation stays fit on all rows
    #    (In the full pipeline we fit on X_train only — see train_model().)
    #    Here we compute global stats for the artifact; train_model() will
    #    restrict them to the training split.
    numeric_cols     = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object"]).columns.tolist()

    # Exclude target from numeric imputation
    numeric_feature_cols = [c for c in numeric_cols if c != TARGET]

    null_counts = df.isnull().sum()
    null_cols   = null_counts[null_counts > 0].index.tolist()
    if null_cols:
        print(f"\n  Null columns: {null_cols}")

    # 3. Fill — assign form (not inplace) to avoid pandas DeprecationWarning
    for col in numeric_feature_cols:
        if df[col].isnull().any():
            fill_val = df[col].median()
            df[col] = df[col].fillna(fill_val)
            print(f"  {col}: filled {null_counts[col]} NaNs with median={fill_val:.4f}")

    for col in categorical_cols:
        if df[col].isnull().any():
            fill_val = df[col].mode()[0]
            df[col] = df[col].fillna(fill_val)
            print(f"  {col}: filled {null_counts[col]} NaNs with mode='{fill_val}'")

    return df


def encode_features(df: pd.DataFrame):
    """
    Label-encode every categorical column.

    Returns:
      df        — DataFrame with categorical columns replaced by integer codes
      encoders  — {col_name: LabelEncoder} to reuse at inference
    """
    encoders: dict[str, LabelEncoder] = {}
    for col in df.select_dtypes(include=["object"]).columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"  Encoded '{col}': {list(le.classes_)}")
    return df, encoders


# ──────────────────────────────────────────────────────────────────
# LAYER 2 — MODEL TRAINING
# ──────────────────────────────────────────────────────────────────

def train_model(df: pd.DataFrame):
    """
    Split data, refit imputation on X_train only, train Random Forest with
    class-imbalance correction, evaluate, and return the model + metadata.

    Returns:
      model         — fitted RandomForestClassifier
      feature_names — ordered list of feature column names
      impute_values — {col: fill_value} computed from X_train only
      train_ranges  — {col: (min, max)} numeric feature bounds from X_train
      class_weight  — 'balanced' for class imbalance handling
      best_threshold— optimized threshold
    """
    X = df.drop(columns=[TARGET])
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y,
    )
    print(f"\nTrain: {len(X_train):,}  |  Test: {len(X_test):,}")
    print(f"Train churn rate: {y_train.mean():.2%}")

    # ── Refit imputation on X_train only ──────────────────────────
    # (df was already cleaned globally; here we record train-only stats
    #  so the predictor can apply *exactly* the same fill at inference.)
    impute_values: dict = {}
    train_ranges:  dict = {}

    numeric_cols     = X_train.select_dtypes(include=[np.number]).columns
    categorical_cols = X_train.select_dtypes(include=["object"]).columns

    for col in numeric_cols:
        med = float(X_train[col].median())
        impute_values[col] = med
        train_ranges[col]  = (float(X_train[col].min()), float(X_train[col].max()))

    for col in categorical_cols:
        impute_values[col] = X_train[col].mode()[0]

    # ── Class-imbalance weight ────────────────────────────────────
    neg  = int((y_train == 0).sum())
    pos  = int((y_train == 1).sum())
    print(f"Class balance — 0:{neg}  1:{pos}  using class_weight='balanced'")

    # ── Random Forest Configuration ───────────────────────────────
    rf_params = dict(
        n_estimators=200,
        max_depth=None,          # Let trees grow deep
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced', # Handles imbalance automatically
        random_state=42,
        n_jobs=-1,
        verbose=0,
    )

    # ── Stratified Cross-Validation ───────────────────────────────
    print("\n── Stratified Cross-Validation ─────────────────")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_acc, cv_prec, cv_rec, cv_f1 = [], [], [], []
    val_probs = np.zeros(len(X_train))

    for train_idx, val_idx in skf.split(X_train, y_train):
        X_f_train, y_f_train = X_train.iloc[train_idx], y_train.iloc[train_idx]
        X_f_val, y_f_val = X_train.iloc[val_idx], y_train.iloc[val_idx]

        f_model = RandomForestClassifier(**rf_params)
        f_model.fit(X_f_train, y_f_train)

        y_f_prob = f_model.predict_proba(X_f_val)[:, 1]
        val_probs[val_idx] = y_f_prob
        y_f_pred = (y_f_prob >= 0.5).astype(int)

        cv_acc.append(accuracy_score(y_f_val, y_f_pred))
        cv_prec.append(precision_score(y_f_val, y_f_pred))
        cv_rec.append(recall_score(y_f_val, y_f_pred))
        cv_f1.append(f1_score(y_f_val, y_f_pred))

    print(f"  Accuracy  : {np.mean(cv_acc):.4f} ± {np.std(cv_acc):.4f}")
    print(f"  Precision : {np.mean(cv_prec):.4f} ± {np.std(cv_prec):.4f}")
    print(f"  Recall    : {np.mean(cv_rec):.4f} ± {np.std(cv_rec):.4f}")
    print(f"  F1 Score  : {np.mean(cv_f1):.4f} ± {np.std(cv_f1):.4f}")

    # ── Threshold Tuning ──────────────────────────────────────────
    thresholds = np.linspace(0.1, 0.9, 81)
    best_f1, best_threshold = 0, 0.5
    for t in thresholds:
        preds = (val_probs >= t).astype(int)
        f1 = f1_score(y_train, preds)
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = float(t)
    print(f"\n── Threshold Tuning ─────────────────────────────")
    print(f"  Optimized Threshold : {best_threshold:.4f} (Validation F1: {best_f1:.4f})")

    # ── Final Model Training ──────────────────────────────────────
    model = RandomForestClassifier(**rf_params)
    model.fit(X_train, y_train)

    # ── Evaluation on Holdout Set ─────────────────────────────────
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= best_threshold).astype(int)

    print("\n── Holdout Evaluation ────────────────────────────")
    print(f"  Accuracy  : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision : {precision_score(y_test, y_pred):.4f}")
    print(f"  Recall    : {recall_score(y_test, y_pred):.4f}")
    print(f"  F1 Score  : {f1_score(y_test, y_pred):.4f}")
    print(f"  ROC-AUC   : {roc_auc_score(y_test, y_proba):.4f}")
    print("\n── Confusion Matrix ──")
    cm = confusion_matrix(y_test, y_pred)
    print(f"TN: {cm[0,0]:<5} FP: {cm[0,1]}\nFN: {cm[1,0]:<5} TP: {cm[1,1]}")
    print("\n── Classification Report ──")
    print(classification_report(y_test, y_pred, target_names=["Stay", "Churn"]))

    # ── Feature importance (top 10) ───────────────────────────────
    importance = sorted(
        zip(X.columns, model.feature_importances_),
        key=lambda t: t[1], reverse=True,
    )
    print("── Top 10 Feature Importances ──")
    for feat, imp in importance[:10]:
        bar = "█" * int(imp * 200)
        print(f"  {feat:<35} {imp:.4f}  {bar}")

    return model, list(X.columns), impute_values, train_ranges, 'balanced', best_threshold


# ──────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────

def main():
    print("=" * 52)
    print("  ChurnShield — Model Training Pipeline")
    print("=" * 52)

    # Step 1: Ensure dataset exists
    if not os.path.exists(DATA_PATH):
        print("\nDataset not found — downloading...")
        sys.path.insert(0, os.path.join(BASE_DIR, ".."))
        from data.download_dataset import download_dataset
        download_dataset()

    # Step 2: Clean
    print("\n── Layer 1: Data Cleaning & Imputation ──")
    df = load_and_clean(DATA_PATH)

    # Step 3: Encode categoricals
    print("\n── Encoding Categorical Features ──")
    df, encoders = encode_features(df)

    # Step 4: Train
    print("\n── Layer 2: Model Training ──")
    model, feature_names, impute_values, train_ranges, class_weight, best_threshold = train_model(df)

    # Step 5: Save artifacts
    #   Everything the predictor needs is bundled into churn_encoder.pkl so
    #   the predictor never has to touch the raw CSV.
    artifacts = {
        "encoders":         encoders,       # {col: LabelEncoder}
        "feature_names":    feature_names,  # ordered model input list
        "impute_values":    impute_values,  # {col: median | mode} from X_train
        "train_ranges":     train_ranges,   # {col: (min, max)} for clipping
        "class_weight":     class_weight,   # saved for reference / retraining
        "best_threshold":   best_threshold, # optimized classification threshold
    }

    joblib.dump(model,     MODEL_PATH)
    joblib.dump(artifacts, ENCODER_PATH)

    print(f"\nModel saved    → {MODEL_PATH}")
    print(f"Artifacts saved → {ENCODER_PATH}")
    print("\nTraining complete!")


if __name__ == "__main__":
    main()
