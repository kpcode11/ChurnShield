## Plan: XGBoost Classification Upgrade

This plan upgrades the current churn training flow to add robust XGBoost evaluation with cross-validation, threshold tuning, and full quality reporting, while preserving backend compatibility. It keeps all non-ID features in the first implementation and adds transparent feature-importance reporting so the most impactful columns are clearly documented. The work is focused mainly in the training pipeline and keeps inference artifact contracts stable for existing API endpoints.

**Steps**
1. Add strict schema checks in [model/train_model.py](model/train_model.py): validate required columns (especially Churn), drop CustomerID only, and fail fast on malformed or non-binary target data.
2. Harden preprocessing in [model/train_model.py](model/train_model.py): keep deterministic train-time imputation/encoding and preserve artifacts needed for inference consistency.
3. Add stratified cross-validation in [model/train_model.py](model/train_model.py) using imbalance-aware XGBoost and compute fold-wise accuracy, precision, recall, and F1 with aggregate mean/std.
4. Extend holdout evaluation in [model/train_model.py](model/train_model.py) to include confusion matrix plus accuracy, precision, recall, and F1.
5. Add threshold tuning in [model/train_model.py](model/train_model.py) using validation probabilities to select the best operating threshold for balanced real-world performance.
6. Persist threshold and evaluation metadata in artifacts in [model/train_model.py](model/train_model.py) without removing existing artifact keys consumed by [backend/predictor.py](backend/predictor.py).
7. Update [backend/predictor.py](backend/predictor.py) only if required to consume stored threshold while preserving response shape and endpoint behavior in [backend/main.py](backend/main.py).
8. Add concise documentation updates in [README.md](README.md) describing cross-validation outputs, confusion matrix, thresholding logic, and feature-importance reporting.

**Verification**
- Run training pipeline end-to-end and confirm:
  - Cross-validation metrics are printed (accuracy, precision, recall, F1).
  - Holdout confusion matrix is printed.
  - Final holdout metrics are printed (accuracy, precision, recall, F1).
  - Feature-importance ranking is printed.
  - Selected threshold is printed and saved.
- Run backend smoke checks:
  - Import check for backend startup.
  - Uvicorn startup with reload.

**Decisions**
- Feature strategy: all non-ID features with importance reporting.
- Compatibility: preserve current API and artifact contract.
- Thresholding: tune threshold from validation/CV rather than fixed 0.5.
- Selection objective: use imbalance-aware evaluation with threshold optimization for best practical accuracy.

If you want, I can also provide a second Markdown variant formatted as a project handoff checklist for teammates.
