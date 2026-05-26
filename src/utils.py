"""
Utility functions for logging, saving models, and configuration.
"""
import os
import yaml
import joblib
import logging

def load_config(config_path: str = "config.yaml") -> dict:
    """Load the YAML configuration file."""
    if not os.path.exists(config_path):
        # Look in the parent directory if running from src
        config_path = os.path.join(os.path.dirname(__file__), "..", config_path)
    with open(config_path, "r") as file:
        return yaml.safe_load(file)

def save_config(config: dict, config_path: str = "config.yaml"):
    """Save the updated configuration file."""
    if not os.path.exists(config_path):
        config_path = os.path.join(os.path.dirname(__file__), "..", config_path)
    with open(config_path, "w") as file:
        yaml.dump(config, file)

def get_logger(name: str) -> logging.Logger:
    """Setup and return a configured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

def ensure_dir(file_path: str):
    """Ensure the directory exists for a given file path."""
    directory = os.path.dirname(file_path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)

def resolve_path(path: str) -> str:
    """Resolve paths relative to the project root."""
    if not os.path.isabs(path):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        return os.path.join(project_root, path)
    return path

def save_object(obj, path: str):
    """Save a Python object via joblib."""
    path = resolve_path(path)
    ensure_dir(path)
    joblib.dump(obj, path)

def load_object(path: str):
    """Load a Python object via joblib."""
    path = resolve_path(path)
    return joblib.load(path)

def sanity_check(model, X_train, y_train, X_test, y_test):
    """
    Detects overfitting and data leakage by comparing train vs test metrics.
    Raises a warning if the gap looks suspicious.
    """
    from sklearn.metrics import roc_auc_score

    train_auc = roc_auc_score(y_train, model.predict_proba(X_train)[:, 1])
    test_auc  = roc_auc_score(y_test,  model.predict_proba(X_test)[:, 1])
    gap       = train_auc - test_auc

    logger = get_logger(__name__)
    logger.info(f"Train AUC: {train_auc:.4f} | Test AUC: {test_auc:.4f} | Gap: {gap:.4f}")

    if train_auc > 0.99:
        logger.warning("LEAKAGE SUSPECTED: Train AUC > 0.99. Check for target-leaking features or train/test contamination.")
    if gap > 0.05:
        logger.warning(f"OVERFITTING SUSPECTED: Train/test AUC gap is {gap:.4f}. Consider regularisation or fewer estimators.")
    if test_auc < 0.85:
        logger.warning("LOW PERFORMANCE: Test AUC < 0.85. Check for preprocessing errors or insufficient features.")

    return {"train_auc": train_auc, "test_auc": test_auc, "gap": gap}
