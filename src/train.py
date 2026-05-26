"""
XGBoost training pipeline.
"""
import argparse
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import RandomizedSearchCV
from .preprocess import load_and_preprocess_data
from .utils import load_config, save_config, get_logger, save_object, sanity_check

logger = get_logger(__name__)

def train_model(tune: bool = False, config_path: str = "config.yaml"):
    """
    Train XGBoost model with optional hyperparameter tuning.
    """
    config = load_config(config_path)
    X_train, X_test, y_train, y_test, _ = load_and_preprocess_data(config_path)
    
    # 4.1 Compute scale_pos_weight
    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
    logger.info(f"Computed scale_pos_weight: {scale_pos_weight:.4f}")
    
    xgb_params = config["xgboost"]
    
    if tune:
        logger.info("Running hyperparameter tuning...")
        param_grid = {
            'max_depth': [3, 4, 5],
            'learning_rate': [0.01, 0.05, 0.1],
            'n_estimators': [100, 200, 300],
            'subsample': [0.7, 0.8, 1.0],
            'colsample_bytree': [0.7, 0.8, 1.0],
            'min_child_weight': [5, 7, 10],
            'gamma': [0.3, 1, 3],
            'reg_alpha': [0.1, 1, 5],
            'reg_lambda': [1, 3, 5],
        }
        
        base_model = XGBClassifier(
            scale_pos_weight=scale_pos_weight,
            use_label_encoder=xgb_params.get("use_label_encoder", False),
            eval_metric=xgb_params.get("eval_metric", "auc"),
            random_state=xgb_params.get("random_state", 42),
            n_jobs=xgb_params.get("n_jobs", -1),
            early_stopping_rounds=30
        )
        
        random_search = RandomizedSearchCV(
            base_model, param_distributions=param_grid, 
            n_iter=10, scoring='roc_auc', cv=5, verbose=1, random_state=42
        )
        
        random_search.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        logger.info(f"Best parameters found: {random_search.best_params_}")
        logger.info(f"Best CV ROC-AUC: {random_search.best_score_:.4f}")
        
        # Update config with best params
        for k, v in random_search.best_params_.items():
            config["xgboost"][k] = v
        save_config(config, config_path)
        
        model = random_search.best_estimator_
    else:
        logger.info("Training XGBoost with parameters from config...")
        model = XGBClassifier(
            n_estimators=xgb_params.get("n_estimators", 300),
            max_depth=xgb_params.get("max_depth", 6),
            learning_rate=xgb_params.get("learning_rate", 0.05),
            subsample=xgb_params.get("subsample", 0.8),
            colsample_bytree=xgb_params.get("colsample_bytree", 0.8),
            min_child_weight=xgb_params.get("min_child_weight", 5),
            gamma=xgb_params.get("gamma", 0.1),
            reg_alpha=xgb_params.get("reg_alpha", 0.1),
            reg_lambda=xgb_params.get("reg_lambda", 1.0),
            scale_pos_weight=scale_pos_weight,
            use_label_encoder=xgb_params.get("use_label_encoder", False),
            eval_metric=xgb_params.get("eval_metric", "auc"),
            random_state=xgb_params.get("random_state", 42),
            n_jobs=xgb_params.get("n_jobs", -1),
            early_stopping_rounds=30
        )
        
        # 4.3 Training with Early Stopping
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=50
        )
    
    # 4.4.5 Sanity Check
    logger.info("Running sanity check...")
    sanity_check(model, X_train, y_train, X_test, y_test)
    
    # 4.5 Save the Model
    model_pkl_path = config["paths"]["model_pkl"]
    model_json_path = config["paths"]["model_json"]
    
    logger.info(f"Saving model to {model_pkl_path} and {model_json_path}")
    save_object(model, model_pkl_path)
    model.get_booster().save_model(model_json_path)
    
    logger.info("Training pipeline complete.")
    return model

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train XGBoost Model")
    parser.add_argument("--tune", action="store_true", help="Run hyperparameter tuning")
    args = parser.parse_args()
    train_model(tune=args.tune)
