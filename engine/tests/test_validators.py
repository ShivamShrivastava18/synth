import numpy as np
import pandas as pd
import pytest

from synth_engine.validators.dcr import compute_dcr_min
from synth_engine.validators.tstr import compute_tstr_auc
from synth_engine.validators.ks_js import compute_ks_avg, compute_js_avg


def test_tstr_handles_string_multiclass_target():
    """Regression: real Lending Club loan_status is a 7-class string column."""
    rng = np.random.default_rng(0)
    n = 800
    labels = ["Fully Paid", "Current", "Charged Off"]
    probs = [0.6, 0.25, 0.15]
    real = pd.DataFrame({
        "amount": rng.normal(15_000, 5_000, n),
        "rate": rng.normal(12.5, 3.0, n),
        "income": rng.normal(70_000, 20_000, n),
    })
    real["status"] = rng.choice(labels, n, p=probs)
    # synth is real with small noise — TSTR should be informative (>0.5)
    synth = real.copy()
    synth["amount"] += rng.normal(0, 100, n)
    auc = compute_tstr_auc(synth, real, target_col="status")
    assert not np.isnan(auc), "TSTR should return a finite value for string targets"
    assert 0.0 <= auc <= 1.0, f"AUC out of range: {auc}"


def test_dcr_min_is_high_for_independent_data():
    rng = np.random.default_rng(0)
    real = pd.DataFrame(rng.normal(0, 1, (500, 4)), columns=list("abcd"))
    synth = pd.DataFrame(rng.normal(0, 1, (500, 4)), columns=list("abcd"))
    dcr = compute_dcr_min(synth, real)
    # With 500 synthetic rows in 4D Gaussian space, the minimum DCR is typically
    # ~0.15-0.25. The spec's production threshold (>=0.10) is for real-world use;
    # the test only needs to confirm independent data has non-trivially high DCR.
    assert dcr > 0.15, f"independent samples should have high DCR, got {dcr}"


def test_dcr_min_is_low_when_synthetic_copies_real():
    rng = np.random.default_rng(0)
    real = pd.DataFrame(rng.normal(0, 1, (500, 4)), columns=list("abcd"))
    synth = real.iloc[:100].copy()  # synthetic = first 100 real rows
    dcr = compute_dcr_min(synth, real)
    assert dcr < 0.01, f"copied data should have ~0 DCR, got {dcr}"


def test_tstr_high_when_synth_matches_real():
    rng = np.random.default_rng(0)
    n = 1000
    real = pd.DataFrame({"x": rng.normal(0, 1, n), "y": rng.normal(0, 1, n)})
    real["target"] = (real["x"] > 0).astype(int)
    synth = real.copy()
    synth["x"] += rng.normal(0, 0.1, n)  # small noise; relationship preserved
    auc = compute_tstr_auc(synth, real, target_col="target")
    assert auc > 0.8, f"AUC {auc} should be high for near-identical synth"


def test_tstr_returns_nan_when_target_missing():
    rng = np.random.default_rng(0)
    real = pd.DataFrame({"x": rng.normal(0, 1, 100)})
    synth = pd.DataFrame({"x": rng.normal(0, 1, 100)})
    auc = compute_tstr_auc(synth, real, target_col="nonexistent")
    assert np.isnan(auc)


def test_ks_low_for_same_distribution():
    rng = np.random.default_rng(0)
    real = pd.DataFrame({"x": rng.normal(0, 1, 1000), "y": rng.normal(5, 2, 1000)})
    synth = pd.DataFrame({"x": rng.normal(0, 1, 1000), "y": rng.normal(5, 2, 1000)})
    ks = compute_ks_avg(synth, real)
    assert ks < 0.1, f"KS {ks} should be low for matched distributions"


def test_ks_high_for_different_distributions():
    rng = np.random.default_rng(0)
    real = pd.DataFrame({"x": rng.normal(0, 1, 1000)})
    synth = pd.DataFrame({"x": rng.normal(5, 1, 1000)})  # shifted +5
    ks = compute_ks_avg(synth, real)
    assert ks > 0.5, f"KS {ks} should be high for shifted distribution"


def test_js_low_for_same_categoricals():
    real = pd.DataFrame({"c": ["a"] * 500 + ["b"] * 500})
    synth = pd.DataFrame({"c": ["a"] * 490 + ["b"] * 510})
    js = compute_js_avg(synth, real)
    assert js < 0.05, f"JS {js} should be low for similar categorical frequencies"


def test_js_high_for_different_categoricals():
    real = pd.DataFrame({"c": ["a"] * 900 + ["b"] * 100})
    synth = pd.DataFrame({"c": ["a"] * 100 + ["b"] * 900})  # flipped
    js = compute_js_avg(synth, real)
    assert js > 0.3, f"JS {js} should be high for flipped categorical distribution"
