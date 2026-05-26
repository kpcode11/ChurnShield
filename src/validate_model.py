"""
Model validation from 4.md — labelled profiles and post-retrain sanity checks.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any

from .predict import predict_single
from .validation_profiles import VALIDATION_CASES

HIGH_RISK_FACTOR_NAMES = {
    "SatisfactionScore",
    "Complain",
    "SupportTicketCount",
    "LastLoginDaysAgo",
    "ReturnRate",
}


def _prob(result: dict) -> float:
    return float(result.get("churn_probability", result.get("probability", 0)))


def _risk(result: dict) -> str:
    return str(result.get("risk_level", result.get("risk", "Unknown")))


def _pred(result: dict) -> int:
    return int(result.get("prediction", result.get("churn", -1)))


def run_profile_checks(verbose: bool = True) -> tuple[bool, dict[str, dict]]:
    """Run Part 2 labelled test cases. Returns (all_passed, results_by_label)."""
    results: dict[str, dict] = {}
    passed = True

    for label, profile in VALIDATION_CASES.items():
        r = predict_single(profile)
        prob = _prob(r)
        risk = _risk(r)
        pred = _pred(r)
        factors = [f["feature"] for f in r.get("top_risk_factors", [])]
        results[label] = {"prob": prob, "risk": risk, "pred": pred, "factors": factors, "raw": r}

        if verbose:
            print(f"{label:25s}  prob={prob:.3f}  risk={risk:6s}  pred={pred}  factors={factors}")

    print()
    if results["HIGH_CHURN"]["prob"] < 0.75:
        print(f"FAIL  HIGH_CHURN prob below 0.75: {results['HIGH_CHURN']['prob']:.3f}")
        passed = False
    else:
        print(f"PASS  HIGH_CHURN prob: {results['HIGH_CHURN']['prob']:.3f}")
        if results["HIGH_CHURN"]["pred"] != 1:
            print(f"FAIL  HIGH_CHURN prediction expected 1, got {results['HIGH_CHURN']['pred']}")
            passed = False
        if results["HIGH_CHURN"]["risk"] != "High":
            print(f"FAIL  HIGH_CHURN risk_level expected High, got {results['HIGH_CHURN']['risk']}")
            passed = False
        overlap = HIGH_RISK_FACTOR_NAMES.intersection(results["HIGH_CHURN"]["factors"])
        if len(overlap) < 2:
            print(
                f"FAIL  HIGH_CHURN top_risk_factors missing key drivers "
                f"(got {results['HIGH_CHURN']['factors']})"
            )
            passed = False

    mod_prob = results["MODERATE_CHURN"]["prob"]
    if not (0.30 <= mod_prob <= 0.65):
        print(f"FAIL  MODERATE_CHURN prob outside 0.30-0.65: {mod_prob:.3f}")
        passed = False
    else:
        print(f"PASS  MODERATE_CHURN prob: {mod_prob:.3f}")
        if results["MODERATE_CHURN"]["risk"] != "Medium":
            print(
                f"FAIL  MODERATE_CHURN risk_level expected Medium, "
                f"got {results['MODERATE_CHURN']['risk']}"
            )
            passed = False

    low_prob = results["LOW_CHURN"]["prob"]
    if low_prob > 0.15:
        print(f"FAIL  LOW_CHURN prob above 0.15: {low_prob:.3f}")
        passed = False
    else:
        print(f"PASS  LOW_CHURN prob: {low_prob:.3f}")
        if results["LOW_CHURN"]["pred"] != 0:
            print(f"FAIL  LOW_CHURN prediction expected 0, got {results['LOW_CHURN']['pred']}")
            passed = False
        if results["LOW_CHURN"]["risk"] != "Low":
            print(f"FAIL  LOW_CHURN risk_level expected Low, got {results['LOW_CHURN']['risk']}")
            passed = False

    loyal_prob = results["LOYAL_W_COMPLAINT"]["prob"]
    if not (0.30 <= loyal_prob <= 0.70):
        print(f"FAIL  LOYAL_W_COMPLAINT prob outside 0.30-0.70: {loyal_prob:.3f}")
        passed = False
    else:
        print(f"PASS  LOYAL_W_COMPLAINT prob: {loyal_prob:.3f}")
        if results["LOYAL_W_COMPLAINT"]["risk"] != "Medium":
            print(
                f"FAIL  LOYAL_W_COMPLAINT risk_level expected Medium, "
                f"got {results['LOYAL_W_COMPLAINT']['risk']}"
            )
            passed = False

    print()
    print("Overall:", "ALL PASS" if passed else "ONE OR MORE CHECKS FAILED — do not deploy")
    return passed, results


def check_metrics_file(path: str = "outputs/metrics.json") -> tuple[bool, list[str]]:
    """Part 3 steps 4–5: threshold and AUC checks from metrics.json."""
    issues: list[str] = []
    if not os.path.exists(path):
        return False, [f"Missing {path} — run python -m src.evaluate first"]

    with open(path, encoding="utf-8") as f:
        m = json.load(f)

    threshold = m.get("threshold", 0.5)
    if not (0.38 <= threshold <= 0.52):
        issues.append(f"threshold {threshold} outside 0.38–0.52")

    auc = m.get("auc_roc", 0)
    if not (0.87 <= auc <= 0.93):
        issues.append(f"auc_roc {auc} outside 0.87–0.93")

    return len(issues) == 0, issues


def main() -> int:
    ok_profiles, _ = run_profile_checks(verbose=True)
    ok_metrics, metric_issues = check_metrics_file()
    if metric_issues:
        print("\nMetrics checks:")
        for msg in metric_issues:
            print(f"  FAIL  {msg}")
    else:
        print("\nPASS  metrics.json threshold and AUC in expected ranges")

    return 0 if (ok_profiles and ok_metrics) else 1


if __name__ == "__main__":
    sys.exit(main())
