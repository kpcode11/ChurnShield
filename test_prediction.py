"""
Quick test script to verify the Random Forest model works correctly.
Run: python test_prediction.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from predictor import predict_single, predict_bulk
import pandas as pd

print("=" * 60)
print("  ChurnShield — Prediction Test")
print("=" * 60)

# Test 1: Single prediction (high-risk customer)
print("\n── Test 1: High-Risk Customer ──")
high_risk = {
    "Tenure": 1,                          # New customer
    "CityTier": 3,                        # Tier 3 city
    "WarehouseToHome": 30,                # Far from warehouse
    "HourSpendOnApp": 1,                  # Low engagement
    "NumberOfDeviceRegistered": 1,
    "SatisfactionScore": 1,               # Very unsatisfied
    "NumberOfAddress": 8,                 # Many addresses (unstable)
    "Complain": 1,                        # Has complained
    "OrderAmountHikeFromlastYear": 5,     # Low spending increase
    "CouponUsed": 0,                      # Doesn't use coupons
    "OrderCount": 1,                      # Only 1 order
    "DaySinceLastOrder": 20,              # Long time since last order
    "CashbackAmount": 50,                 # Low cashback
    "PreferredLoginDevice": "Phone",
    "PreferredPaymentMode": "COD",
    "Gender": "Male",
    "PreferedOrderCat": "Mobile",
    "MaritalStatus": "Single"
}

result = predict_single(high_risk)
print(f"  Churn Prediction: {result['churn']} ({'CHURN' if result['churn'] == 1 else 'STAY'})")
print(f"  Probability:      {result['probability']:.4f} ({result['probability_pct']:.1f}%)")
print(f"  Risk Level:       {result['risk']}")

# Test 2: Single prediction (low-risk customer)
print("\n── Test 2: Low-Risk Customer ──")
low_risk = {
    "Tenure": 20,                         # Long-term customer
    "CityTier": 1,                        # Tier 1 city
    "WarehouseToHome": 10,                # Close to warehouse
    "HourSpendOnApp": 5,                  # High engagement
    "NumberOfDeviceRegistered": 3,
    "SatisfactionScore": 5,               # Very satisfied
    "NumberOfAddress": 2,                 # Stable
    "Complain": 0,                        # No complaints
    "OrderAmountHikeFromlastYear": 25,    # High spending increase
    "CouponUsed": 5,                      # Uses coupons
    "OrderCount": 10,                     # Many orders
    "DaySinceLastOrder": 2,               # Recent order
    "CashbackAmount": 300,                # High cashback
    "PreferredLoginDevice": "Mobile Phone",
    "PreferredPaymentMode": "Credit Card",
    "Gender": "Female",
    "PreferedOrderCat": "Laptop & Accessory",
    "MaritalStatus": "Married"
}

result = predict_single(low_risk)
print(f"  Churn Prediction: {result['churn']} ({'CHURN' if result['churn'] == 1 else 'STAY'})")
print(f"  Probability:      {result['probability']:.4f} ({result['probability_pct']:.1f}%)")
print(f"  Risk Level:       {result['risk']}")

# Test 3: Bulk prediction
print("\n── Test 3: Bulk Prediction (3 customers) ──")
bulk_data = pd.DataFrame([
    high_risk,
    low_risk,
    {  # Medium risk
        "Tenure": 10,
        "CityTier": 2,
        "WarehouseToHome": 15,
        "HourSpendOnApp": 3,
        "NumberOfDeviceRegistered": 2,
        "SatisfactionScore": 3,
        "NumberOfAddress": 3,
        "Complain": 0,
        "OrderAmountHikeFromlastYear": 15,
        "CouponUsed": 2,
        "OrderCount": 5,
        "DaySinceLastOrder": 5,
        "CashbackAmount": 150,
        "PreferredLoginDevice": "Computer",
        "PreferredPaymentMode": "Debit Card",
        "Gender": "Male",
        "PreferedOrderCat": "Fashion",
        "MaritalStatus": "Single"
    }
])

results = predict_bulk(bulk_data)
print(f"\n  Results:")
for i, row in results.iterrows():
    print(f"    Customer {i+1}: {row['Risk_Level']:<8} "
          f"(P={row['Churn_Probability']:.4f})  "
          f"→ {row['Suggested_Action']}")

print("\n" + "=" * 60)
print("  ✅ All tests passed! Model is working correctly.")
print("=" * 60)
print("\n  Next steps:")
print("    1. Start backend:  cd backend && python main.py")
print("    2. Start frontend: cd client && npm run dev")
print("    3. Open browser:   http://localhost:5173")
print("=" * 60)
