# ChurnShield

**ChurnShield** is a complete, end-to-end AI-powered Customer Churn Prediction & Retention Intelligence platform. It is designed to help e-commerce businesses identify at-risk customers, understand *why* they are leaving, and generate actionable, personalized retention strategies.

---

## 🏗️ System Architecture & Workflow

The ChurnShield ecosystem is divided into three distinct layers that communicate seamlessly:

1. **Machine Learning Pipeline (`src/`)**: Generates data, trains the model, and exposes Python inference functions.
2. **FastAPI Backend (`backend/`)**: Acts as the middleman, taking HTTP requests from the frontend and executing ML inferences or data aggregations.
3. **React Frontend (`client/`)**: The user-facing dashboard for business stakeholders.

Here is the detailed workflow of how data moves through the system:

---

## 1. Machine Learning & Dataset Workflow (`src/` & `data/`)

The heart of ChurnShield is an **XGBoost Classifier**. XGBoost was chosen because it excels at tabular datasets and easily integrates with SHAP for explainable AI.

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

---

## 2. Backend API Workflow (`backend/`)

The backend is built with **FastAPI** (Python) and serves as the bridge between the heavy ML scripts and the lightweight frontend.

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

## 🚀 How to Run the Project

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

## 🧠 Retraining the Model

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

## 📁 Repository Structure

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
