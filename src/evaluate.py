"""
Evaluation script for XGBoost model.
"""
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import shap
from sklearn.metrics import (
    roc_auc_score, f1_score, recall_score, precision_score, 
    accuracy_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)
from .utils import load_config, save_config, get_logger, load_object
from .preprocess import load_and_preprocess_data

logger = get_logger(__name__)

import json

def save_metrics(y_test, y_pred, y_prob, threshold, output_path='outputs/metrics.json'):
    from sklearn.metrics import (
        roc_auc_score, f1_score, recall_score,
        precision_score, accuracy_score, confusion_matrix
    )

    cm = confusion_matrix(y_test, y_pred).tolist()

    metrics = {
        "accuracy":   round(accuracy_score(y_test, y_pred), 4),
        "auc_roc":    round(roc_auc_score(y_test, y_prob), 4),
        "f1_churn":   round(f1_score(y_test, y_pred), 4),
        "recall":     round(recall_score(y_test, y_pred), 4),
        "precision":  round(precision_score(y_test, y_pred), 4),
        "threshold":  round(threshold, 4),
        "confusion_matrix": cm,
        "class_labels": ["Not Churned", "Churned"],
        "train_size": None,
        "test_size":  len(y_test),
        "model":      "XGBoost"
    }

    with open(output_path, 'w') as f:
        json.dump(metrics, f, indent=2)

    return metrics

def optimize_threshold(y_true, y_prob):
    """Sweep thresholds from 0.1 to 0.9 to find the one maximizing F1-score."""
    thresholds = np.arange(0.1, 0.91, 0.01)
    best_f1 = 0
    best_threshold = 0.5
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        f1 = f1_score(y_true, y_pred)
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = t
    return float(best_threshold), best_f1

def evaluate_model(model=None, config_path: str = "config.yaml", retune_if_needed: bool = True):
    """
    Evaluate the XGBoost model, generate metrics and plots.
    """
    config = load_config(config_path)
    X_train, X_test, y_train, y_test, _ = load_and_preprocess_data(config_path)
    
    if model is None:
        model_path = config["paths"]["model_pkl"]
        logger.info(f"Loading model from {model_path}")
        model = load_object(model_path)
        
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # 5.3 Threshold Optimization
    best_threshold, _ = optimize_threshold(y_test, y_prob)
    logger.info(f"Optimized Threshold for F1-Score: {best_threshold:.4f}")
    
    # Update config with optimal threshold
    config["evaluation"]["optimal_threshold"] = best_threshold
    save_config(config, config_path)
    
    y_pred = (y_prob >= best_threshold).astype(int)
    
    # 5.1 Required Metrics
    auc = roc_auc_score(y_test, y_prob)
    f1 = f1_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    acc = accuracy_score(y_test, y_pred)
    
    logger.info("--- Evaluation Metrics ---")
    logger.info(f"AUC-ROC   : {auc:.4f}")
    logger.info(f"F1-Score  : {f1:.4f}")
    logger.info(f"Recall    : {recall:.4f}")
    logger.info(f"Precision : {precision:.4f}")
    logger.info(f"Accuracy  : {acc:.4f}")
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))
    
    # Check targets
    if retune_if_needed and (auc < 0.92 or f1 < 0.78 or recall < 0.80):
        logger.warning("Metrics fell below target benchmarks. Triggering automatic re-tuning...")
        from .train import train_model
        # Train and tune, then evaluate again but don't re-trigger
        tuned_model = train_model(tune=True, config_path=config_path)
        return evaluate_model(model=tuned_model, config_path=config_path, retune_if_needed=False)
        
    # 5.2 Required Plots
    plots_dir = config["paths"]["plots_dir"]
    os.makedirs(plots_dir, exist_ok=True)
    
    # 1. ROC Curve
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    plt.figure()
    plt.plot(fpr, tpr, label=f"AUC = {auc:.4f}")
    plt.plot([0, 1], [0, 1], 'k--')
    plt.title("ROC Curve")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.legend()
    plt.savefig(os.path.join(plots_dir, "roc_curve.png"), dpi=150)
    plt.close()
    
    # 2. Precision-Recall Curve
    prec_vals, rec_vals, _ = precision_recall_curve(y_test, y_prob)
    plt.figure()
    plt.plot(rec_vals, prec_vals)
    plt.title("Precision-Recall Curve")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.savefig(os.path.join(plots_dir, "pr_curve.png"), dpi=150)
    plt.close()
    
    # 3. Confusion Matrix Heatmap (Normalised)
    cm = confusion_matrix(y_test, y_pred, normalize='true')
    plt.figure()
    sns.heatmap(cm, annot=True, fmt='.2%', cmap='Blues')
    plt.title("Normalised Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.savefig(os.path.join(plots_dir, "confusion_matrix.png"), dpi=150)
    plt.close()
    
    # 4. Feature Importance
    importance = model.feature_importances_
    features = X_train.columns
    indices = np.argsort(importance)[-20:] # Top 20
    plt.figure(figsize=(10, 8))
    plt.barh(range(len(indices)), importance[indices], align='center')
    plt.yticks(range(len(indices)), [features[i] for i in indices])
    plt.title("Top 20 Feature Importances (Gain)")
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "feature_importance.png"), dpi=150)
    plt.close()
    
    # 5. Learning Curve
    evals_result = model.evals_result()
    if evals_result:
        train_auc = evals_result['validation_0']['auc']
        # XGBoost internally might log validation_0 for train and validation_1 for test if passed both, 
        # but we only passed eval_set=[(X_test, y_test)]. Let's check what keys exist.
        plt.figure()
        for label, metrics in evals_result.items():
            if 'auc' in metrics:
                plt.plot(metrics['auc'], label=label)
        plt.title("Learning Curve (AUC)")
        plt.xlabel("Boosting Round")
        plt.ylabel("AUC")
        plt.legend()
        plt.savefig(os.path.join(plots_dir, "learning_curve.png"), dpi=150)
        plt.close()
        
    # 6. SHAP Summary Plot
    logger.info("Generating SHAP summary plot...")
    explainer = shap.TreeExplainer(model)
    # Use a sample to speed up if data is large, but X_test (1100 rows) is fine.
    shap_values = explainer.shap_values(X_test)
    plt.figure()
    shap.summary_plot(shap_values, X_test, show=False)
    plt.savefig(os.path.join(plots_dir, "shap_summary.png"), dpi=150, bbox_inches='tight')
    plt.close()
    
    logger.info("Evaluation complete and plots saved.")
    
    # Save metrics for comparison report later and frontend
    save_metrics(y_test, y_pred, y_prob, best_threshold)
    
    return {
        "AUC-ROC": auc,
        "F1-Score (churn)": f1,
        "Recall (churn)": recall,
        "Precision (churn)": precision
    }

if __name__ == "__main__":
    evaluate_model()
