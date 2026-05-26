# ChurnShield

> **Customer Churn Prediction & Retention Intelligence for E-Commerce**

ChurnShield is an end-to-end machine learning application that predicts which customers are at risk of churning and helps businesses take targeted action to retain them — complete with AI-generated personalised messages, revenue impact analysis, and a polished interactive dashboard.

---

## Features

| Module | Description |
|---|---|
| **Churn Prediction** | Enter a customer's details and get an instant churn probability with risk classification |
| **Analytics Dashboard** | Visual breakdown of churn drivers across your customer base |
| **Bulk CSV Prediction** | Upload a customer CSV and get churn scores for every row, exportable to Excel |
| **Revenue Calculator** | Translate churn predictions into financial impact — revenue at risk, campaign ROI, and more |
| **Retention Suggestions** | Tailored retention strategies for each customer segment |
| **AI Message Generator** | Claude-powered personalised WhatsApp/email retention messages (with template fallback) |

---

## Architecture

```
┌─────────────────┐        HTTP/REST        ┌──────────────────────┐
│  Streamlit UI   │ ──────────────────────► │  FastAPI Backend     │
│  frontend/app.py│                         │  backend/main.py     │
└─────────────────┘                         └──────────┬───────────┘
                                                        │
                              ┌─────────────────────────┼──────────────────────┐
                              ▼                         ▼                      ▼
                    ┌──────────────────┐   ┌─────────────────────┐  ┌─────────────────┐
                    │  XGBoost Model   │   │  Revenue Calculator  │  │  Claude AI API  │
                    │  model/*.pkl     │   │  backend/revenue.py  │  │  (Anthropic)    │
                    └──────────────────┘   └─────────────────────┘  └─────────────────┘
```

---

## Project Structure

```
ChurnShield/
├── requirements.txt              # Python dependencies
│
├── data/
│   ├── download_dataset.py       # Kaggle dataset downloader
│   └── ecommerce_churn.csv       # E-Commerce churn dataset
│
├── model/
│   └── train_model.py            # XGBoost training script → saves .pkl artifacts
│
├── backend/
│   ├── main.py                   # FastAPI app — all 6 API endpoints
│   ├── predictor.py              # Model loading & single/bulk inference
│   ├── suggestions.py            # Retention strategy logic
│   ├── revenue.py                # Revenue & ROI calculations
│   └── message_generator.py      # Claude AI + template message generator
│
└── frontend/
    └── app.py                    # Streamlit multi-page UI
```

---

## Installation & Setup

### Prerequisites

- Python **3.10+**
- pip

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ChurnShield.git
cd ChurnShield
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download the dataset

The dataset is already included in `data/ecommerce_churn.csv`. If you need to re-download it from Kaggle, run:

```bash
python data/download_dataset.py
```

> You will need a Kaggle API token (`~/.kaggle/kaggle.json`) for this step.

### 5. Train the model

```bash
python model/train_model.py
```

This generates two files in `model/`:
- `churn_model.pkl` — trained XGBoost classifier
- `churn_encoder.pkl` — label encoders and feature metadata

### 6. (Optional) Set up Claude AI

To enable AI-generated retention messages, set your Anthropic API key as an environment variable:

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# macOS / Linux
export ANTHROPIC_API_KEY="sk-ant-..."
```

If no key is provided, ChurnShield automatically falls back to built-in template messages.

---

## Running the Application

ChurnShield requires two processes running simultaneously — the FastAPI backend and the Streamlit frontend.

### Terminal 1 — Start the Backend

```bash
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### Terminal 2 — Start the Frontend

```bash
streamlit run frontend/app.py
```

The dashboard will open automatically at `http://localhost:8501`.

---

## Model Details

| Property | Value |
|---|---|
| Algorithm | Imbalance-aware XGBoost Classifier |
| Dataset | E-Commerce Customer Churn (Kaggle) |
| Target | `Churn` (binary: 0 = retained, 1 = churned) |
| Features | Tenure, purchase behaviour, satisfaction score, city tier, device, complaints, and more |
| Preprocessing | Strict schema validation, median/mode imputation, LabelEncoding |
| Evaluation Metrics | Fold-wise Stratified Cross-Validation (Accuracy, Precision, Recall, F1), plus Confusion Matrix on Holdout |
| Threshold Tuning | Automatically optimized operating threshold using validation F1-score to maximize real-world performance |
| Explainability | Top-10 Feature Importances reported after training |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Machine Learning | XGBoost, scikit-learn |
| Backend API | FastAPI, Uvicorn |
| Frontend | Streamlit, Plotly |
| AI Messaging | Anthropic Claude |
| Data Processing | pandas, NumPy |
| Model Persistence | joblib |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Predict churn for a single customer |
| `POST` | `/predict-bulk` | Bulk churn prediction from CSV upload |
| `POST` | `/suggestions` | Get retention suggestions for a customer |
| `POST` | `/revenue-impact` | Calculate campaign ROI and revenue at risk |
| `POST` | `/generate-message` | Generate AI retention message |
| `GET` | `/analytics` | Aggregate analytics from the dataset |

Full interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

---

## Requirements

```
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.5.1
xgboost==2.1.1
joblib==1.4.2
fastapi==0.115.0
uvicorn==0.30.6
python-multipart==0.0.9
openpyxl==3.1.5
streamlit==1.38.0
requests==2.32.3
plotly==5.24.0
anthropic==0.34.1
kagglehub==0.3.4
```

---

## License

This project is licensed under the MIT License.
