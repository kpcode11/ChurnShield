# ChurnShield Project & Model Explanation

## 1. XGBoost: Formula and Logic

### Where the logic lies
In this repository, the XGBoost logic is separated into two parts:
1. **Training (Offline):** Handled in `model/train_model.py` and the `src/` directory (like `src/train.py`). This is where the model learns from the data, establishes the optimal splits, and saves its state as serialized artifacts (e.g., `churn_model.pkl`, `outputs/metrics.json`).
2. **Inference (Online):** Handled in `backend/predictor.py`. Here, the saved model acts as a decision engine. `predictor.py` doesn't train the model; it simply loads the XGBoost trees and passes formatted input vectors through them to get the probability of churn via `.predict_proba(X)`.

*(Note: While `predictor.py` contains a comment mentioning `RandomForestClassifier`, the evaluation metrics in `analytics.py` specifically mention XGBoost fallback, indicating an ensemble tree-based classifier is used).*

### The Formula
XGBoost (eXtreme Gradient Boosting) is an ensemble learning method built on decision trees. Its prediction formula is additive:

$$ \hat{y}_i = \sum_{k=1}^K f_k(x_i) $$

Where:
- $\hat{y}_i$ is the predicted probability for the $i$-th customer.
- $K$ is the total number of trees.
- $f_k$ represents an independent classification tree.
- $x_i$ is the feature vector of the customer.

XGBoost optimizes the following objective function during training:

$$ \text{Obj} = \sum_{i=1}^n l(y_i, \hat{y}_i) + \sum_{k=1}^K \Omega(f_k) $$

- $l(y_i, \hat{y}_i)$ is a differentiable loss function (e.g., Log Loss for binary classification) measuring the difference between the true churn label $y_i$ and the predicted label.
- $\Omega(f_k) = \gamma T + \frac{1}{2}\lambda||w||^2$ is the regularization term to penalize complexity (preventing overfitting), where $T$ is the number of leaves in the tree and $w$ represents the leaf weights.

---

## 2. File: `backend/predictor.py`

**Purpose:** This is the Machine Learning inference engine for the backend. It sits between the API and the XGBoost model outputs.

**Key Responsibilities & Detailed Logic:**
- **Model Loading:** The `_load_model()` function lazy-loads the model artifact `churn_model.pkl` and data processors `churn_encoder.pkl`.
- **Data Preprocessing (`_encode_input`):** 
  - Prevents data leakage by strictly applying *training-set* rules stored in `churn_encoder.pkl` (e.g., median filling for missing values or clipping outliers to training bounds). 
  - Maps missing or unseen categorical values safely to default encoded classes.
  - Ensures that the dataframe columns strictly align with the exact sequence `feature_names` used during model training.
- **Single Prediction (`predict_single`):** Takes a dictionary of a single customer, applies transformations, and runs it against the model to return `churn` (0 or 1), a `probability`, and a human-readable `risk` tag (High/Medium/Low based on 30% and 60% thresholds).
- **Bulk Prediction (`predict_bulk`):** Ingests an entire Pandas DataFrame (typically uploaded via CSV), efficiently vectorizing the application of missing-value imputation and encoding. It attaches `Churn_Probability`, `Risk_Level`, and a `Suggested_Action` column to the output file.

---

## 3. File: `backend/analytics.py`

**Purpose:** This file acts as an aggregation and OLAP (Online Analytical Processing) layer. It calculates Key Performance Indicators (KPIs) and groups data for the "Live Analytics Dashboard".

**Key Responsibilities & Detailed Logic:**
- **Data Aggregations:** Exposes methods like `compute_overview()`, `compute_churn_by_group()`, and `compute_tenure_bands()` using Pandas grouping. It removes synthetic testing rows (like anchors) via `_production_customers()`.
- **A/B KPI Comparisons (`compute_kpi_comparison`):** Slices the dataset into "Churned" vs "Stayed" groups to highlight behavioral differences (e.g., average orders, return rates). 
- **Time-Series Logic (`compute_monthly_trend`):** Treats `Tenure` as the lifecyle axis to build a retention curve mapping out at which month customers are most likely to drop off. It uses rolling averages to smooth out the trend lines and calculates the "peak churn month".
- **Model Transparency:** 
  - `compute_model_performance()` reads the `outputs/metrics.json` file to surface the model's accuracy, F1 score, precision, and ROC AUC to the dashboard.
  - `compute_feature_importance()` returns the influence mathematically wielded by each feature in making predictions.

---

## 4. File: `backend/main.py`

**Purpose:** The entry point to the backend web application via the FastAPI framework. It handles HTTP requests, dependency injection, and data formatting.

**Key Responsibilities & Detailed Logic:**
- **API Routing:**
  - `POST /predict` & `POST /predict/bulk`: Trigger processing pipelines defined in `predictor.py`.
  - `GET /analytics` & `/analytics/trends`: Call into `analytics.py` functions to deliver dashboard JSON payloads.
  - `POST /revenue` & `/metrics/revenue-impact`: Evaluate the financial cost of churning customers and the ROI of retaining them.
  - `POST /suggest` & `/message`: Generate engagement strategies via Language Models (LLM) or deterministic rules to save at-risk customers.
- **Data Caching:** The script uses an in-memory Pandas dataframe `_df_cache` reading from `ecommerce_churn_enhanced.csv` loaded exactly once when the server starts up. This makes dashboard API requests blazing fast.
- **Excel Formatting (`_style_predictions_sheet`, `_write_summary_sheet`):** The bulk endpoints allow exporting processed insights to Excel format. These helper loops dynamically color-code rows based on risk level (e.g., Red for High Risk, Green for Low Risk) and resize columns dynamically using the `openpyxl` library.
