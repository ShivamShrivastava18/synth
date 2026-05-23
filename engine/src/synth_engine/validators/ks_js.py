"""KS (numeric) and JS (categorical) distributional similarity metrics."""
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp
from scipy.spatial.distance import jensenshannon


def compute_ks_avg(synth: pd.DataFrame, real: pd.DataFrame) -> float:
    num_cols = real.select_dtypes(include="number").columns
    num_cols = [c for c in num_cols if c in synth.columns]
    if not num_cols:
        return 0.0
    stats = [ks_2samp(real[c].dropna(), synth[c].dropna()).statistic for c in num_cols]
    return float(np.mean(stats))


def compute_js_avg(synth: pd.DataFrame, real: pd.DataFrame) -> float:
    cat_cols = real.select_dtypes(exclude="number").columns
    cat_cols = [c for c in cat_cols if c in synth.columns]
    if not cat_cols:
        return 0.0
    out = []
    for c in cat_cols:
        cats = sorted(set(real[c].dropna()) | set(synth[c].dropna()))
        p = real[c].value_counts(normalize=True).reindex(cats, fill_value=1e-9).to_numpy()
        q = synth[c].value_counts(normalize=True).reindex(cats, fill_value=1e-9).to_numpy()
        out.append(jensenshannon(p, q))
    return float(np.mean(out))
