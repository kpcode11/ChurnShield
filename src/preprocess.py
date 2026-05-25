"""
Data preprocessing pipeline for XGBoost.
"""
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from typing import Tuple, Dict, Any
from .utils import load_config, get_logger, save_object

logger = get_logger(__name__)

def load_and_preprocess_data(config_path: str = "config.yaml") -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, OrdinalEncoder]:
    """
    Load data, clean, encode categorical features, and split into train/test sets.
    """
    config = load_config(config_path)
    
    # 1. Load data
    data_path = config["paths"]["data"]
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    
    # 2. Deduplicate
    initial_shape = df.shape
    df = df.drop_duplicates()
    logger.info(f"Dropped {initial_shape[0] - df.shape[0]} duplicate rows. New shape: {df.shape}")

    # 3. Drop CustomerID
    drop_cols = config["features"]["drop"]
    logger.info(f"Dropping columns: {drop_cols}")
    df = df.drop(columns=drop_cols, errors='ignore')
    
    # 4. Separate features and target
    target_col = config["features"]["target"]
    logger.info(f"Separating features and target '{target_col}'")
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    # 5. Train/test split BEFORE encoding
    logger.info("Performing train/test split with stratify=y")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=0.2, 
        random_state=config["xgboost"]["random_state"], 
        stratify=y
    )

    # 6. Encode the 6 categorical columns
    categorical_cols = config["features"]["categorical"]
    logger.info(f"Encoding categorical columns: {categorical_cols}")
    
    # Using OrdinalEncoder with handle_unknown='use_encoded_value' for robust inference
    encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
    
    # Fit on train only, transform both
    X_train[categorical_cols] = encoder.fit_transform(X_train[categorical_cols])
    X_test[categorical_cols] = encoder.transform(X_test[categorical_cols])
    
    # 7. Do NOT apply standard scaling (Skipped as per instructions)
    
    # 8. Save encoders and return
    encoder_path = config["paths"]["encoders"]
    logger.info(f"Saving fitted encoders to {encoder_path}")
    save_object(encoder, encoder_path)
    
    return X_train, X_test, y_train, y_test, encoder

if __name__ == "__main__":
    load_and_preprocess_data()
