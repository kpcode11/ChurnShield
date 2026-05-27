# ChurnShield

**ChurnShield** is a complete, end-to-end AI-powered Customer Churn Prediction & Retention Intelligence platform. It is designed to help e-commerce businesses identify at-risk customers, understand *why* they are leaving, and generate actionable, personalized retention strategies.

---

## System Architecture & Workflow

The ChurnShield ecosystem is divided into three distinct layers that communicate seamlessly:

1. **Machine Learning Pipeline (`src/`)**: Generates data, trains the model, and exposes Python inference functions.
2. **FastAPI Backend (`backend/`)**: Acts as the middleman, taking HTTP requests from the frontend and executing ML inferences or data aggregations.
3. **React Frontend (`client/`)**: The user-facing dashboard for business stakeholders.

Here is the detailed workflow of how data moves through the system:

---

## 1. Machine Learning & Dataset Workflow (`src/` & `data/`)

The heart of ChurnShield is an **XGBoost Classifier**. 

### What is XGBoost and Why Was It Chosen?
**XGBoost (Extreme Gradient Boosting)** is a highly efficient, scalable machine learning library based on the gradient boosting framework. By definition, it works by building an ensemble of sequential decision trees, where each subsequent tree rigorously attempts to correct the errors (residuals) made by the combination of all previous trees.

We chose XGBoost over other algorithms (like Logistic Regression, SVM, Random Forest, or Neural Networks) for several key reasons:
1. **State-of-the-Art Performance on Tabular Data**: E-commerce customer data is structured (tabular features like `Tenure`, `OrderCount`, `SatisfactionScore`). XGBoost consistently crushes both traditional models and deep learning approaches on structured, spreadsheet-like data.
2. **Complex, Non-Linear Interactions**: Variables in e-commerce interact in complicated ways. For example, high application usage usually indicates loyalty, but if it is paired with recent support complaints, it flags severe churn risk. XGBoost's deep tree mapping natively captures these non-linear interactions without needing manual feature engineering.
3. **Imbalance Handling**: Churn datasets are inherently imbalanced (the vast majority of people stay; only a fraction churn). XGBoost features native hyperparameters (like `scale_pos_weight`) to heavily penalize missing a churner, automatically handling this imbalance.
4. **Explainability**: Unlike Neural Networks, which are a "black box," XGBoost is highly interpretable. We can extract exact feature importance (Gain/Weight) and integrate seamlessly with explainability frameworks like SHAP or Anchor.

### How XGBoost Works in ChurnShield
In the context of this project, XGBoost maps historical customer behaviors and demographics to a future risk state. 
- **Training**: It analyzes the patterns in `ecommerce_churn_enhanced.csv` to find hidden threshold rules that cleanly separate loyal customers from those who abandon the platform.
- **Inference**: During live prediction via the FastAPI backend, the model evaluates new customer data through its ensemble of trees to compute a continuous probability (e.g., `0.85`) of churn.
- **Explainable Insights**: We extract internal tree split metrics to populate the global "Top churn drivers" on the dashboard. Furthermore, we evaluate its pathways locally to provide human-readable explanations detailing exactly *why* a specific user is flagged as high-risk.

### Explainable AI (XAI): SHAP and Anchor
Because we are predicting something as deeply human as customer loyalty, providing just a percentage (e.g., "85% risk") is not actionable for support agents. To solve this, our project uses two different Explainable AI frameworks:

**1. SHAP (SHapley Additive exPlanations)**
* **What it is**: SHAP is a framework based on cooperative game theory. It breaks down a machine learning prediction by treating each feature (e.g., `Tenure`, `OrderCount`) as a "player" cooperating to reach the final probability.
* **How we use it**: During a single customer prediction (`/predict`), we run the XGBoost `TreeExplainer` to calculate the exact Shapley values. This allows the API to return the **Top 3 Risk Factors** isolated specifically for *that specific customer* (e.g., "This customer has +15% risk specifically because their Complain score is 1").

**2. Anchor Explanations & Calibration**
* **What it is**: Anchor rules provide local, high-precision "if-then" conditions. An anchor says "If A and B are true, the prediction is practically guaranteed."
* **How we use it**: While SHAP provides numerical attribution, we use Anchor (`src/anchor_calibrate.py`) sequentially *after* XGBoost to calibrate probabilities. If a customer hits deeply entrenched negative conditions that we know from business logic represent extreme risk, the Anchor heuristic "anchors" or recalibrates the raw XGBoost probability to reflect that absolute business truth, improving domain relevance.

### Dataset Handling
* **Data Generation**: Instead of using raw, leaky Kaggle data, we use a synthetic data generator (`generate_churn_dataset.py`). This script creates a realistic dataset of 5,630 e-commerce customers with 28 features (e.g., `Tenure`, `SatisfactionScore`, `Complain`, `LastLoginDaysAgo`). 
* **Causality**: The target label (`Churn`) is generated *after* the feature values, ensuring strict, realistic causal relationships without data leakage. The dataset is saved to `data/ecommerce_churn_enhanced.csv`.

### Model Training Logic (`src/train.py` & `src/preprocess.py`)
When you train the model, the following pipeline executes:
1. **Load & Clean**: Loads the CSV, drops irrelevant identifiers (`CustomerID`), and splits the data into Training and Testing sets *before* doing anything else to prevent leakage.
2. **Encode**: Categorical features (like `PreferredLoginDevice`) are converted into numeric formats using `LabelEncoder`. Crucially, encoders are fitted **only** on the training set to prevent "look-ahead" bias.
3. **Hyperparameter Tuning**: It uses `RandomizedSearchCV` with 5-fold cross-validation to test multiple combinations of `max_depth`, `learning_rate`, `n_estimators`, and L1/L2 regularization to find the optimal model architecture.
4. **Class Imbalance**: Churn is naturally imbalanced (~83% stay, ~17% churn). The pipeline automatically computes `scale_pos_weight` to heavily penalize the model when it misses a churner.
5. **Sanity Checks**: Evaluates the gap between Train AUC and Test AUC to ensure the model isn't overfitting.

### Evaluation (`src/evaluate.py`)
The model is evaluated and the threshold for predicting "Churn" is optimized to maximize the **F1-Score**. It outputs `outputs/metrics.json` (which contains accuracy, AUC-ROC, recall, and a naive baseline comparison) and saves visualizations (ROC curves, Confusion Matrices) to `outputs/plots/`.

#### Understanding Our Evaluation Metrics
Because customer churn inherently deals with imbalanced data (the vast majority stay, a small percentage leave), standard metrics can be misleading. Here is how we measure success in ChurnShield:
* **Threshold**: XGBoost outputs a continuous probability (0.0 to 1.0). The threshold is the numerical cutoff where we formally classify a user as "At Risk of Churn". Instead of a blind `0.50` default, `evaluate.py` mathematically sweeps all possibilities to find the exact threshold that maximizes the F1-Score.
* **Accuracy**: The overall percentage of correct predictions. *In this project*: This is recorded but taken with a grain of salt. If 83% of customers naturally stay, a broken "dumb" model that just predicts "Stay" for everyone achieves 83% accuracy but offers zero business value.
* **Recall (Sensitivity)**: Out of all the customers who *actually* churned, what percentage did the model successfully catch? *In this project*: High recall is crucial so no at-risk customer slips away without a retention intervention (minimizing False Negatives).
* **Precision**: Out of everyone the model *predicted* would churn, how many actually did? *In this project*: High precision ensures we don't waste expensive retention campaigns or discounts on customers who were perfectly happy and going to stay anyway (minimizing False Positives).
* **F1-Score**: The harmonic mean of Precision and Recall. *In this project*: This is our "North Star" metric. It forces the model to strike the perfect balance between catching as many churners as possible without firing off too many false alarms.
* **ROC-AUC (Receiver Operating Characteristic - Area Under Curve)**: Measures the model's overall ability to segregate the "Churn" class from the "Stay" class across *all* possible thresholds. *In this project*: An AUC of 0.5 is a random coin toss; 1.0 is perfect. This metric operates independent of the threshold, proving that our XGBoost feature map fundamentally works.

---

## 2. Backend API Workflow (`backend/`)

The backend is built with **FastAPI** (Python) and serves as the bridge between the heavy ML scripts and the lightweight frontend.

### Why FastAPI instead of Flask or Django?
We chose FastAPI over traditional frameworks for three critical reasons tailored to Machine Learning applications:
1. **Pydantic Validation**: Machine learning models crash spectacularly if fed bad data types (e.g., passing a string instead of an int for `Tenure`). FastAPI uses Pydantic to strictly validate the JSON payload *before* it reaches the ML functions.
2. **Speed & Async**: FastAPI is built on Starlette and supports asynchronous endpoints (`async def`). In bulk-prediction scenarios, this non-blocking nature allows the server to handle concurrent frontend requests much faster than standard Flask.
3. **Overhead & Auto-Docs**: Django is a "batteries-included" monolith utilizing an ORM, which is unnecessary here since we are serving an ML model, not a relational database app. FastAPI is micro-framework lightweight but natively generates interactive Swagger UI documentation (`/docs`), making API-Frontend integration a breeze.

### Endpoints and Logic
* **`/predict` (Single Inference)**: The frontend sends a JSON payload of a single customer's features. The backend calls `src.predict.predict()`. The ML script runs the data through the saved Encoders, feeds it to the XGBoost model, and uses **SHAP (SHapley Additive exPlanations)** to calculate the top 3 specific features that drove this customer's risk score. It returns the churn probability, risk level (High/Medium/Low), and the SHAP factors.
* **`/predict/bulk` (Batch Inference)**: Accepts a CSV file upload. The backend parses it using `pandas`, runs the entire batch through the model, computes risk levels for everyone, assigns recommended business actions, and returns a formatted Excel spreadsheet for the user to download.
* **`/analytics` & `/analytics/trends`**: Instead of hitting a database, the backend caches the `ecommerce_churn_enhanced.csv` in memory on startup. It performs high-speed `pandas` group-by operations to serve live JSON statistics (e.g., "Churn by City Tier", "Rolling Churn Rates") to the frontend dashboard.
* **`/metrics/revenue-impact`**: Takes a list of customer churn probabilities and their average order values to calculate "Revenue at Risk". It also computes the Return on Investment (ROI) of a theoretical retention campaign based on expected retention rates and campaign costs.

---

## 3. Frontend Dashboard (`client/`)

The frontend is a **Single Page Application (SPA)** built with **React**, **TypeScript**, and **Vite**. It utilizes **TailwindCSS** for rapid styling and **shadcn/ui** for accessible, unstyled UI primitives.

### Why this stack?
* **Vite**: Provides lightning-fast Hot Module Replacement (HMR) and optimized production builds.
* **TypeScript**: Ensures type safety across the complex JSON responses coming from the FastAPI backend, preventing runtime UI crashes.
* **TailwindCSS**: Allows for beautiful, responsive design systems directly inside the JSX.

### User Interface Flow
1. **Overview Dashboard**: Fetches data from `/analytics` and displays overarching business KPIs (Total Customers, Overall Churn Rate) and demographic pie/bar charts.
2. **Predictor Form**: A complex React Hook Form that allows customer service agents to manually input customer data. It validates the inputs and hits the `/predict` backend endpoint, displaying a dynamic Risk Gauge and the SHAP-derived "Top Risk Factors" banner.
3. **Model Performance**: Reads directly from `outputs/metrics.json` to prove the model's worth to stakeholders. It displays the F1-Score and compares the XGBoost model against a "Naive Baseline" to mathematically prove that the AI is adding business value.
4. **Revenue Calculator**: A sandbox tool where marketers can adjust sliders (Campaign Cost, Expected Retention) to instantly recalculate the ROI of saving at-risk customers, using the `/metrics/revenue-impact` backend logic.

---

## How to Run the Project

You will need **two terminals** to run the full application—one for the backend, and one for the frontend.

### Prerequisites
* **Python 3.9+** (For the ML/Backend)
* **Node.js 18+** (For the Frontend)

### 1. Start the Backend (FastAPI)
Open your first terminal and navigate to the project root.
*(Note: It is crucial to start the server from the `backend/` directory or ensure paths resolve to the project root).*

```bash
# Activate your virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Run the backend server
python backend/main.py
```
*The API will be available at: http://localhost:8000*

### 2. Start the Frontend (React/Vite)
Open a second terminal and navigate to the `client` directory:
```bash
cd client

# Install dependencies (if you haven't already)
npm install

# Start the development server
npm run dev
```
*The UI will be available at: http://localhost:8080* (or the port specified by Vite in the console).

---

## Retraining the Model

If you want to tweak hyperparameters or retrain the model from scratch, follow these steps from the project root:

1. **(Optional) Regenerate Dataset:** 
   ```bash
   python generate_churn_dataset.py --output data/ecommerce_churn_enhanced.csv --rows 5630
   ```
2. **Clear Old Models:** Delete the old model files in the `models/` directory.
3. **Train:** 
   ```bash
   python -m src.train --tune
   ```
4. **Evaluate:** 
   ```bash
   python -m src.evaluate
   ```
   *This will update the `outputs/metrics.json` file, which the frontend automatically reads to populate the Model Performance page.*

---

## Repository Structure

```text
ChurnShield/
│
├── backend/                  # FastAPI Application
│   ├── main.py               # API Endpoints
│   ├── analytics.py          # Dashboard aggregations
│   └── revenue.py            # ROI calculations
│
├── client/                   # React Frontend (Vite/TypeScript)
│   ├── src/
│   │   ├── components/       # Reusable UI components (shadcn/ui)
│   │   ├── pages/            # Main dashboard views (Analytics, Predict, Performance)
│   │   └── services/         # API integration logic
│   ├── package.json          # Node dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── data/                     # Datasets
│   └── ecommerce_churn_enhanced.csv  # The ground-truth training data
│
├── models/                   # Saved ML Models (DO NOT EDIT MANUALLY)
│   ├── xgboost_churn.pkl     # Trained XGBoost weights
│   └── encoders.pkl          # Fitted categorical encoders
│
├── outputs/                  # Model Evaluation Outputs
│   ├── metrics.json          # Live metrics read by the frontend
│   └── plots/                # SHAP, ROC, and Confusion Matrix charts
│
├── src/                      # Machine Learning Source Code
│   ├── train.py              # XGBoost training & tuning logic
│   ├── evaluate.py           # Metrics calculation & threshold optimization
│   ├── predict.py            # Inference & SHAP explanation logic
│   └── preprocess.py         # Data cleaning & train/test splitting
│
├── config.yaml               # ML Configuration & Hyperparameters
└── generate_churn_dataset.py # Synthetic dataset generator
```
