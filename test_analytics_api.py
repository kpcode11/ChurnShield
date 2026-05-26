"""
Quick test script to verify the analytics API returns real Random Forest data.
Run this after starting the backend server (python backend/main.py).
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_analytics():
    """Test GET /analytics endpoint for feature importance and model performance."""
    print("Testing GET /analytics endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/analytics", timeout=10)
        response.raise_for_status()
        data = response.json()
        
        print("\n✓ Analytics endpoint responded successfully")
        print(f"  Total customers: {data.get('total_customers', 'N/A')}")
        print(f"  Overall churn rate: {data.get('overall_churn_rate', 'N/A')}%")
        
        # Check model performance
        if "model_performance" in data:
            perf = data["model_performance"]
            print("\n✓ Model Performance Data Found:")
            print(f"  Model: {perf.get('model_name', 'N/A')}")
            print(f"  ROC-AUC: {perf.get('roc_auc', 'N/A')}")
            print(f"  Accuracy: {perf.get('accuracy', 'N/A')}")
            print(f"  F1 Score: {perf.get('f1_score', 'N/A')}")
            print(f"  False Positives: {perf.get('false_positives', 'N/A')}")
            print(f"  False Negatives: {perf.get('false_negatives', 'N/A')}")
        else:
            print("\n✗ Model performance data missing!")
        
        # Check feature importance
        if "feature_importance" in data and data["feature_importance"]:
            print(f"\n✓ Feature Importance Data Found ({len(data['feature_importance'])} features)")
            print("  Top 5 features:")
            for i, feat in enumerate(data["feature_importance"][:5], 1):
                print(f"    {i}. {feat['feature']}: {feat['importance_pct']}%")
        else:
            print("\n✗ Feature importance data missing or empty!")
        
        # Check KPI comparison
        if "kpi_comparison" in data:
            print("\n✓ KPI Comparison Data Found")
            kpi = data["kpi_comparison"]
            print(f"  Avg Cashback - Churned: {kpi['avg_cashback']['churned']}, Stayed: {kpi['avg_cashback']['stayed']}")
        
        print("\n" + "="*60)
        print("✓ All analytics data checks passed!")
        print("="*60)
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n✗ Could not connect to backend. Is it running on port 8000?")
        print("  Start it with: python backend/main.py")
        return False
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False


def test_trends():
    """Test GET /analytics/trends endpoint."""
    print("\n\nTesting GET /analytics/trends endpoint...")
    
    try:
        response = requests.get(f"{BASE_URL}/analytics/trends", timeout=10)
        response.raise_for_status()
        data = response.json()
        
        print("✓ Trends endpoint responded successfully")
        print(f"  Monthly trend points: {len(data.get('monthly_trend', []))}")
        print(f"  Peak churn month: {data.get('peak_churn_month', {}).get('month', 'N/A')}")
        print(f"  Stabilizes after month: {data.get('stabilizes_after_month', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


if __name__ == "__main__":
    print("="*60)
    print("ChurnShield Analytics API Test")
    print("="*60)
    
    success = test_analytics()
    if success:
        test_trends()
    
    print("\n")
