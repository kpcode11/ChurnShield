"""
ChurnShield — Model Comparison Script
======================================
Trains and evaluates 8 classifiers on the E-Commerce Churn dataset.
Produces a detailed metrics report and saves a comparison chart.

Models compared:
  1. Logistic Regression
  2. Linear Discriminant Analysis (LDA)
  3. Decision Tree
  4. Random Forest
  5. Gradient Boosting (sklearn)
  6. XGBoost
  7. K-Nearest Neighbours (KNN)
  8. Support Vector Machine (SVM)

Run:
  python model_comparison.py

Requirements:
  pip install xgboost scikit-learn pandas numpy matplotlib seaborn openpyxl
"""

import warnings
import time
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")          # headless — saves to file instead of popping a window
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline

from sklearn.linear_model    import LogisticRegression
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.tree            import DecisionTreeClassifier
from sklearn.ensemble        import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors       import KNeighborsClassifier
from sklearn.svm             import SVC
from xgboost                 import XGBClassifier

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix,
    classification_report, roc_curve,
)

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG  — edit DATA_PATH to point at your Excel file
# ─────────────────────────────────────────────────────────────────────────────
DATA_PATH  = "data/E Commerce Dataset.xlsx"
SHEET_NAME = "E Comm"
TARGET     = "Churn"
DROP_COLS  = ["CustomerID"]
TEST_SIZE  = 0.20
RANDOM_STATE = 42
CV_FOLDS   = 5

# ─────────────────────────────────────────────────────────────────────────────
# 1.  LOAD & CLEAN
# ─────────────────────────────────────────────────────────────────────────────

def load_and_prepare(path: str) -> tuple[pd.DataFrame, pd.Series]:
    print("─" * 60)
    print("  Loading data …")
    df = pd.read_excel(path, sheet_name=SHEET_NAME)
    print(f"  Shape: {df.shape[0]:,} rows × {df.shape[1]} columns")

    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns])
    df = df.dropna(subset=[TARGET])

    # Impute numeric → median, categorical → mode
    for col in df.select_dtypes(include=[np.number]).columns:
        if col != TARGET and df[col].isnull().any():
            df[col] = df[col].fillna(df[col].median())

    for col in df.select_dtypes(include=["object"]).columns:
        if df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mode()[0])

    # Label-encode categoricals
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = LabelEncoder().fit_transform(df[col].astype(str))

    # Feature engineering (same as notebook)
    if "CashbackAmount" in df.columns and "OrderCount" in df.columns:
        df["avg_cashback_per_order"] = df["CashbackAmount"] / df["OrderCount"].replace(0, np.nan)
        df["avg_cashback_per_order"] = df["avg_cashback_per_order"].fillna(0)

    X = df.drop(columns=[TARGET])
    y = df[TARGET]
    print(f"  Class balance — 0:{(y==0).sum()}  1:{(y==1).sum()}  "
          f"churn rate:{y.mean():.2%}")
    return X, y


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DEFINE MODELS
# ─────────────────────────────────────────────────────────────────────────────

def build_models(scale_pos_weight: float) -> dict:
    """
    Returns a dict of {name: estimator}.
    Models that are sensitive to feature scale are wrapped in a
    StandardScaler Pipeline so the comparison is fair.
    """
    xgb_params = dict(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
        gamma=1, reg_alpha=0.1, reg_lambda=1.0,
        scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_STATE, eval_metric="logloss", n_jobs=-1,
    )

    return {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    LogisticRegression(
                max_iter=1000, class_weight="balanced",
                random_state=RANDOM_STATE, n_jobs=-1
            )),
        ]),

        "LDA": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    LinearDiscriminantAnalysis()),
        ]),

        "Decision Tree": DecisionTreeClassifier(
            max_depth=8, class_weight="balanced",
            random_state=RANDOM_STATE
        ),

        "Random Forest": RandomForestClassifier(
            n_estimators=200, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=-1
        ),

        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            subsample=0.8, random_state=RANDOM_STATE
        ),

        "XGBoost": XGBClassifier(**xgb_params),

        "KNN": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    KNeighborsClassifier(n_neighbors=11, n_jobs=-1)),
        ]),

        "SVM": Pipeline([
            ("scaler", StandardScaler()),
            ("clf",    SVC(
                kernel="rbf", class_weight="balanced",
                probability=True, random_state=RANDOM_STATE
            )),
        ]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3.  EVALUATE  (holdout + cross-validation)
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_all(models: dict, X_train, X_test, y_train, y_test) -> pd.DataFrame:
    scoring = ["accuracy", "precision_weighted", "recall_weighted",
               "f1_weighted", "roc_auc"]

    records = []
    roc_data = {}

    print("\n" + "─" * 60)
    print(f"  Training & evaluating {len(models)} models …\n")

    for name, model in models.items():
        t0 = time.time()

        # ── Cross-validation on training set ─────────────────────
        cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True,
                             random_state=RANDOM_STATE)
        cv_results = cross_validate(
            model, X_train, y_train,
            cv=cv, scoring=scoring,
            return_train_score=False, n_jobs=-1
        )

        # ── Holdout evaluation ────────────────────────────────────
        model.fit(X_train, y_train)
        y_pred  = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        elapsed = time.time() - t0

        acc  = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec  = recall_score(y_test, y_pred, zero_division=0)
        f1   = f1_score(y_test, y_pred, zero_division=0)
        auc  = roc_auc_score(y_test, y_proba)
        cm   = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        roc_data[name] = roc_curve(y_test, y_proba)

        records.append({
            "Model":          name,
            # Holdout
            "Accuracy":       round(acc,  4),
            "Precision":      round(prec, 4),
            "Recall":         round(rec,  4),
            "F1":             round(f1,   4),
            "ROC-AUC":        round(auc,  4),
            "TN": tn, "FP": fp, "FN": fn, "TP": tp,
            # Cross-val
            "CV_F1_mean":     round(cv_results["test_f1_weighted"].mean(), 4),
            "CV_F1_std":      round(cv_results["test_f1_weighted"].std(),  4),
            "CV_AUC_mean":    round(cv_results["test_roc_auc"].mean(),     4),
            "CV_AUC_std":     round(cv_results["test_roc_auc"].std(),      4),
            "Train_time_s":   round(elapsed, 2),
        })

        # Print a concise live summary
        print(f"  [{name:<22}]  "
              f"AUC={auc:.4f}  F1={f1:.4f}  "
              f"Acc={acc:.4f}  "
              f"CV_F1={cv_results['test_f1_weighted'].mean():.4f}±"
              f"{cv_results['test_f1_weighted'].std():.4f}  "
              f"({elapsed:.1f}s)")

    return pd.DataFrame(records), roc_data


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PRINT FULL REPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_report(df: pd.DataFrame) -> None:
    df_sorted = df.sort_values("ROC-AUC", ascending=False).reset_index(drop=True)

    print("\n" + "═" * 100)
    print("  FULL MODEL COMPARISON REPORT")
    print("═" * 100)

    # ── Holdout metrics table ─────────────────────────────────────
    cols = ["Model", "ROC-AUC", "F1", "Accuracy", "Precision", "Recall",
            "CV_F1_mean", "CV_F1_std", "CV_AUC_mean", "CV_AUC_std", "Train_time_s"]
    print("\n── Holdout + Cross-Validation Metrics (sorted by ROC-AUC) ──\n")
    print(df_sorted[cols].to_string(index=False))

    # ── Confusion matrices ────────────────────────────────────────
    print("\n── Confusion Matrices ──\n")
    print(f"  {'Model':<24} {'TN':>6} {'FP':>6} {'FN':>6} {'TP':>6}"
          f"  {'Sensitivity':>12}  {'Specificity':>12}  {'FPR':>8}")
    print("  " + "─" * 78)
    for _, row in df_sorted.iterrows():
        tn, fp, fn, tp = row["TN"], row["FP"], row["FN"], row["TP"]
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        fpr         = fp / (fp + tn) if (fp + tn) > 0 else 0
        print(f"  {row['Model']:<24} {int(tn):>6} {int(fp):>6} "
              f"{int(fn):>6} {int(tp):>6}"
              f"  {sensitivity:>12.4f}  {specificity:>12.4f}  {fpr:>8.4f}")

    # ── Winner announcement ───────────────────────────────────────
    winner = df_sorted.iloc[0]
    print("\n" + "═" * 100)
    print(f"  🏆  BEST MODEL: {winner['Model']}")
    print(f"      ROC-AUC  = {winner['ROC-AUC']:.4f}")
    print(f"      F1 Score = {winner['F1']:.4f}")
    print(f"      Accuracy = {winner['Accuracy']:.4f}")
    print(f"      CV AUC   = {winner['CV_AUC_mean']:.4f} ± {winner['CV_AUC_std']:.4f}")
    print("═" * 100)

    # ── Explanation: why XGBoost (if it wins) ────────────────────
    if winner["Model"] == "XGBoost":
        print("""
  WHY XGBOOST WINS ON THIS DATASET
  ─────────────────────────────────────────────────────────────────────
  1. HANDLES IMBALANCE NATIVELY
     The scale_pos_weight parameter directly upweights the minority
     class (churners) during training. LR and SVM need external
     class_weight="balanced"; tree ensembles benefit less from it.

  2. BUILT-IN REGULARISATION (L1 + L2)
     reg_alpha and reg_lambda prevent overfitting without needing a
     separate scaler or pipeline step. This matters on a 19-feature
     dataset where some features are noisy.

  3. SEQUENTIAL BOOSTING CORRECTS ERRORS
     Unlike Random Forest (parallel trees), XGBoost fits each new
     tree on the residuals of the previous ones — errors shrink
     monotonically. Gradient Boosting (sklearn) does the same but
     is slower and less memory-efficient.

  4. SECOND-ORDER GRADIENTS
     XGBoost uses both first (gradient) and second (Hessian)
     derivatives to compute optimal leaf weights — more precise
     splits than any first-order method (LR, LDA, GBM).

  5. SPEED
     XGBoost's C++ core with n_jobs=-1 trains ~5–10× faster than
     sklearn GradientBoosting on the same data, making
     cross-validation and hyperparameter tuning practical.
  ─────────────────────────────────────────────────────────────────────
""")


# ─────────────────────────────────────────────────────────────────────────────
# 5.  PLOTS
# ─────────────────────────────────────────────────────────────────────────────

PALETTE = [
    "#2563EB", "#16A34A", "#DC2626", "#9333EA",
    "#EA580C", "#0891B2", "#CA8A04", "#BE185D",
]

def plot_comparison(df: pd.DataFrame, roc_data: dict) -> None:
    df_sorted = df.sort_values("ROC-AUC", ascending=False).reset_index(drop=True)
    models    = df_sorted["Model"].tolist()
    colors    = PALETTE[: len(models)]

    fig = plt.figure(figsize=(22, 18))
    fig.patch.set_facecolor("#0F172A")
    plt.suptitle(
        "ChurnShield — Model Comparison Report",
        fontsize=20, fontweight="bold",
        color="white", y=0.98
    )

    # ── 1. Bar chart: key metrics side by side ────────────────────
    ax1 = fig.add_subplot(3, 2, (1, 2))
    ax1.set_facecolor("#1E293B")
    metrics = ["ROC-AUC", "F1", "Accuracy", "Precision", "Recall"]
    x       = np.arange(len(models))
    width   = 0.15
    offsets = np.linspace(-(len(metrics)-1)/2, (len(metrics)-1)/2, len(metrics)) * width

    for i, (metric, offset) in enumerate(zip(metrics, offsets)):
        vals = df_sorted[metric].values
        bars = ax1.bar(x + offset, vals, width, label=metric,
                       color=PALETTE[i], alpha=0.9, edgecolor="none")
        for bar, val in zip(bars, vals):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.004,
                     f"{val:.3f}", ha="center", va="bottom",
                     fontsize=6.5, color="white", rotation=90)

    ax1.set_xticks(x)
    ax1.set_xticklabels(models, rotation=20, ha="right", color="white", fontsize=10)
    ax1.set_ylim(0, 1.15)
    ax1.set_title("Key Metrics Comparison (Holdout Set)",
                  color="white", fontsize=13, pad=10)
    ax1.legend(loc="upper right", fontsize=9,
               facecolor="#334155", labelcolor="white", framealpha=0.8)
    ax1.tick_params(colors="white")
    ax1.set_facecolor("#1E293B")
    for spine in ax1.spines.values():
        spine.set_edgecolor("#334155")
    ax1.yaxis.label.set_color("white")
    ax1.set_ylabel("Score", color="white")

    # ── 2. ROC Curves ─────────────────────────────────────────────
    ax2 = fig.add_subplot(3, 2, 3)
    ax2.set_facecolor("#1E293B")
    ax2.plot([0, 1], [0, 1], "w--", lw=1, alpha=0.4, label="Random (AUC=0.50)")
    for (name, (fpr, tpr, _)), color in zip(roc_data.items(), PALETTE):
        auc = df[df["Model"] == name]["ROC-AUC"].values[0]
        ax2.plot(fpr, tpr, color=color, lw=2, label=f"{name} ({auc:.4f})")
    ax2.set_title("ROC Curves", color="white", fontsize=12)
    ax2.set_xlabel("False Positive Rate", color="white")
    ax2.set_ylabel("True Positive Rate", color="white")
    ax2.tick_params(colors="white")
    ax2.legend(fontsize=7, facecolor="#334155", labelcolor="white",
               loc="lower right", framealpha=0.8)
    for spine in ax2.spines.values():
        spine.set_edgecolor("#334155")

    # ── 3. CV F1 with error bars ──────────────────────────────────
    ax3 = fig.add_subplot(3, 2, 4)
    ax3.set_facecolor("#1E293B")
    y_pos = np.arange(len(models))
    ax3.barh(y_pos, df_sorted["CV_F1_mean"], xerr=df_sorted["CV_F1_std"],
             color=colors, alpha=0.9, height=0.6,
             error_kw=dict(ecolor="white", capsize=4, lw=1.2))
    ax3.set_yticks(y_pos)
    ax3.set_yticklabels(models, color="white", fontsize=10)
    ax3.set_xlabel("CV F1 Score (weighted)", color="white")
    ax3.set_title(f"5-Fold CV F1 Score ± Std Dev", color="white", fontsize=12)
    ax3.tick_params(colors="white")
    for spine in ax3.spines.values():
        spine.set_edgecolor("#334155")
    for i, (mean, std) in enumerate(zip(df_sorted["CV_F1_mean"], df_sorted["CV_F1_std"])):
        ax3.text(mean + std + 0.002, i, f"{mean:.4f}", va="center",
                 color="white", fontsize=9)

    # ── 4. Radar chart ────────────────────────────────────────────
    ax4 = fig.add_subplot(3, 2, 5, polar=True)
    ax4.set_facecolor("#1E293B")
    radar_metrics = ["ROC-AUC", "F1", "Accuracy", "Precision", "Recall"]
    N      = len(radar_metrics)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    angles += angles[:1]

    ax4.set_theta_offset(np.pi / 2)
    ax4.set_theta_direction(-1)
    ax4.set_xticks(angles[:-1])
    ax4.set_xticklabels(radar_metrics, color="white", fontsize=9)
    ax4.set_ylim(0, 1)
    ax4.set_facecolor("#1E293B")
    ax4.tick_params(colors="white")
    ax4.yaxis.set_tick_params(labelcolor="white")
    ax4.grid(color="#334155")

    # Only plot top-5 models on radar to keep it readable
    for (_, row), color in zip(df_sorted.head(5).iterrows(), PALETTE):
        vals = [row[m] for m in radar_metrics] + [row[radar_metrics[0]]]
        ax4.plot(angles, vals, color=color, lw=2)
        ax4.fill(angles, vals, color=color, alpha=0.08)
    ax4.set_title("Radar: Top 5 Models", color="white", fontsize=12, pad=15)
    legend_patches = [
        mpatches.Patch(color=PALETTE[i], label=df_sorted.iloc[i]["Model"])
        for i in range(min(5, len(df_sorted)))
    ]
    ax4.legend(handles=legend_patches, loc="upper right",
               bbox_to_anchor=(1.35, 1.15), fontsize=8,
               facecolor="#334155", labelcolor="white")

    # ── 5. Training time ──────────────────────────────────────────
    ax5 = fig.add_subplot(3, 2, 6)
    ax5.set_facecolor("#1E293B")
    bars = ax5.bar(models, df_sorted["Train_time_s"],
                   color=colors, alpha=0.9, edgecolor="none")
    for bar, val in zip(bars, df_sorted["Train_time_s"]):
        ax5.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                 f"{val:.1f}s", ha="center", color="white", fontsize=9)
    ax5.set_title("Training Time (seconds)", color="white", fontsize=12)
    ax5.set_ylabel("Seconds", color="white")
    ax5.tick_params(axis="x", rotation=20, colors="white")
    ax5.tick_params(axis="y", colors="white")
    ax5.set_facecolor("#1E293B")
    for spine in ax5.spines.values():
        spine.set_edgecolor("#334155")

    plt.tight_layout(rect=[0, 0, 1, 0.97])
    out = "model_comparison_chart.png"
    plt.savefig(out, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"\n  Chart saved → {out}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  ChurnShield — Model Comparison")
    print("=" * 60)

    X, y = load_and_prepare(DATA_PATH)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE,
        random_state=RANDOM_STATE, stratify=y
    )
    print(f"\n  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    neg = int((y_train == 0).sum())
    pos = int((y_train == 1).sum())
    spw = round(neg / pos, 4)

    models        = build_models(spw)
    results_df, roc_data = evaluate_all(models, X_train, X_test, y_train, y_test)

    print_report(results_df)
    plot_comparison(results_df, roc_data)

    # Save CSV
    out_csv = "model_comparison_results.csv"
    results_df.sort_values("ROC-AUC", ascending=False).to_csv(out_csv, index=False)
    print(f"  Results saved → {out_csv}\n")


if __name__ == "__main__":
    main()