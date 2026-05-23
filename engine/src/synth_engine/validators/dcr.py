"""Distance to Closest Record privacy metric.

For each synthetic row, compute Euclidean distance to nearest real row in
scaled feature space. Normalize by median pairwise distance among a sample of
real rows. Returns the minimum ratio across synthetic rows.
"""
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler


def compute_dcr_min(synth: pd.DataFrame, real: pd.DataFrame, sample_for_median: int = 1000) -> float:
    real = real.select_dtypes(include="number").dropna()
    synth = synth.select_dtypes(include="number").dropna()
    cols = [c for c in real.columns if c in synth.columns]
    if not cols:
        return 0.0
    real_v = real[cols].to_numpy()
    synth_v = synth[cols].to_numpy()
    if len(real_v) == 0 or len(synth_v) == 0:
        return 0.0
    scaler = StandardScaler().fit(real_v)
    real_s = scaler.transform(real_v)
    synth_s = scaler.transform(synth_v)
    nn = NearestNeighbors(n_neighbors=1).fit(real_s)
    synth_to_real, _ = nn.kneighbors(synth_s)
    n = min(sample_for_median, len(real_s))
    idx = np.random.default_rng(0).choice(len(real_s), n, replace=False)
    sample = real_s[idx]
    nn2 = NearestNeighbors(n_neighbors=2).fit(sample)
    real_to_real, _ = nn2.kneighbors(sample)
    median_real = np.median(real_to_real[:, 1])
    if median_real == 0:
        return 0.0
    return float(np.min(synth_to_real) / median_real)
