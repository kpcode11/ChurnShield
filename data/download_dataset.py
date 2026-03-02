"""
Download the E-Commerce Customer Churn dataset from Kaggle.
Uses kagglehub to fetch automatically.
If kagglehub fails, falls back to creating a synthetic sample dataset.
"""

import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUTPUT_PATH = os.path.join(DATA_DIR, "ecommerce_churn.csv")


def download_dataset():
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(OUTPUT_PATH):
        print(f"Dataset already exists at {OUTPUT_PATH}")
        return

    # Try kagglehub first
    try:
        import kagglehub
        path = kagglehub.dataset_download("ankitverma2010/ecommerce-customer-churn-analysis-and-prediction")
        # Find the CSV inside downloaded folder
        import glob
        csvs = glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)
        if csvs:
            import shutil
            shutil.copy(csvs[0], OUTPUT_PATH)
            print(f"Dataset downloaded to {OUTPUT_PATH}")
            return
    except Exception as e:
        print(f"kagglehub download failed: {e}")

    # Fallback: generate synthetic dataset matching the schema
    print("Generating synthetic dataset as fallback...")
    import numpy as np
    import pandas as pd

    np.random.seed(42)
    n = 5630

    data = {
        "CustomerID": range(50001, 50001 + n),
        "Churn": np.random.choice([0, 1], size=n, p=[0.83, 0.17]),
        "Tenure": np.random.randint(0, 61, size=n),
        "PreferredLoginDevice": np.random.choice(["Mobile Phone", "Computer", "Phone"], size=n),
        "CityTier": np.random.choice([1, 2, 3], size=n, p=[0.5, 0.3, 0.2]),
        "WarehouseToHome": np.random.randint(5, 127, size=n).astype(float),
        "PreferredPaymentMode": np.random.choice(
            ["Debit Card", "UPI", "Credit Card", "Cash on Delivery", "E wallet"], size=n
        ),
        "Gender": np.random.choice(["Male", "Female"], size=n),
        "HourSpendOnApp": np.random.choice([0, 1, 2, 3, 4, 5], size=n).astype(float),
        "NumberOfDeviceRegistered": np.random.randint(1, 7, size=n),
        "PreferedOrderCat": np.random.choice(
            ["Laptop & Accessory", "Mobile Phone", "Fashion", "Grocery", "Others"], size=n
        ),
        "SatisfactionScore": np.random.randint(1, 6, size=n),
        "MaritalStatus": np.random.choice(["Single", "Married", "Divorced"], size=n),
        "NumberOfAddress": np.random.randint(1, 22, size=n),
        "Complain": np.random.choice([0, 1], size=n, p=[0.75, 0.25]),
        "OrderAmountHikeFromlastYear": np.random.randint(11, 26, size=n).astype(float),
        "CouponUsed": np.random.randint(0, 17, size=n).astype(float),
        "OrderCount": np.random.randint(1, 17, size=n).astype(float),
        "DaySinceLastOrder": np.random.randint(0, 46, size=n).astype(float),
        "CashbackAmount": np.round(np.random.uniform(0, 325, size=n), 2),
    }

    # Introduce some NaN values to mimic real data
    df = pd.DataFrame(data)
    for col in ["Tenure", "WarehouseToHome", "HourSpendOnApp", "OrderAmountHikeFromlastYear",
                 "CouponUsed", "OrderCount", "DaySinceLastOrder"]:
        mask = np.random.random(n) < 0.05
        df.loc[mask, col] = np.nan

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Synthetic dataset saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    download_dataset()
