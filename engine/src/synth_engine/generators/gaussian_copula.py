"""Gaussian Copula generator (unconditional).

Decomposes the joint distribution into per-column non-parametric marginals
plus a Gaussian dependence structure over rank-transformed latents. Generates
new rows by sampling from the multivariate normal and decoding back through
the marginal quantile functions.

Adapted from AI-Agent-for-Synthetic-Data-Generation; the constraint-handling
machinery was stripped (Synth always generates unconditionally).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd
from scipy import stats

from synth_engine.schema import Schema

_EPS = 1e-6


@dataclass
class _NumericMarginal:
    sorted_values: np.ndarray

    def inv_cdf(self, u: np.ndarray) -> np.ndarray:
        n = len(self.sorted_values)
        q = np.clip(u, _EPS, 1 - _EPS)
        positions = q * (n - 1)
        lo = np.floor(positions).astype(int)
        hi = np.ceil(positions).astype(int)
        frac = positions - lo
        return self.sorted_values[lo] * (1 - frac) + self.sorted_values[hi] * frac


@dataclass
class _CategoricalMarginal:
    categories: List[object]
    cumulative: np.ndarray  # shape (k+1,), [0, p1, p1+p2, ..., 1]

    def inv_cdf_to_value(self, u: np.ndarray) -> np.ndarray:
        idx = np.searchsorted(self.cumulative[1:-1], u, side="right")
        idx = np.clip(idx, 0, len(self.categories) - 1)
        return np.array([self.categories[i] for i in idx], dtype=object)


class GaussianCopulaGenerator:
    name = "gaussian_copula"

    def __init__(self, schema: Schema) -> None:
        self.schema = schema
        self._numeric_marginals: Dict[str, _NumericMarginal] = {}
        self._categorical_marginals: Dict[str, _CategoricalMarginal] = {}
        self._col_order: List[str] = []
        self._cov: np.ndarray | None = None
        self._fitted = False

    # ------------------------------------------------------------------ fit
    def fit(self, df: pd.DataFrame) -> "GaussianCopulaGenerator":
        self._col_order = list(df.columns)
        z_cols: List[np.ndarray] = []

        for col in self._col_order:
            series = df[col]
            if col in self.schema.numeric_cols:
                values = pd.to_numeric(series, errors="coerce")
                filled = values.fillna(values.median())
                self._numeric_marginals[col] = _NumericMarginal(
                    sorted_values=np.sort(filled.to_numpy())
                )

                ranks = stats.rankdata(filled.to_numpy(), method="average")
                u = ranks / (len(ranks) + 1)
                z_cols.append(stats.norm.ppf(np.clip(u, _EPS, 1 - _EPS)))
            else:
                mode = series.mode(dropna=True)
                fill = mode.iloc[0] if len(mode) else ""
                s = series.fillna(fill)
                counts = s.value_counts()
                categories = counts.index.tolist()
                probs = (counts / counts.sum()).to_numpy()
                cumulative = np.concatenate([[0.0], np.cumsum(probs)])
                cumulative[-1] = 1.0
                self._categorical_marginals[col] = _CategoricalMarginal(
                    categories=categories, cumulative=cumulative
                )

                idx_map = {c: i for i, c in enumerate(categories)}
                bin_lo = np.array([cumulative[idx_map[v]] for v in s])
                bin_hi = np.array([cumulative[idx_map[v] + 1] for v in s])
                u = (bin_lo + bin_hi) / 2.0
                z_cols.append(stats.norm.ppf(np.clip(u, _EPS, 1 - _EPS)))

        Z = np.column_stack(z_cols)
        cov = np.cov(Z, rowvar=False)
        # Guarantee a 2D matrix even for single-column inputs.
        cov = np.atleast_2d(cov)
        cov = cov + 1e-4 * np.eye(cov.shape[0])
        self._cov = cov
        self._fitted = True
        return self

    # ------------------------------------------------------------------ sample
    def sample(self, n: int, rng: np.random.Generator) -> pd.DataFrame:
        assert self._fitted and self._cov is not None
        d = len(self._col_order)
        Z = rng.multivariate_normal(
            mean=np.zeros(d), cov=self._cov, size=n, method="cholesky"
        )
        return self._decode(Z)

    # ----------------------------------------------------------------- decode
    def _decode(self, Z: np.ndarray) -> pd.DataFrame:
        U = stats.norm.cdf(Z)
        U = np.clip(U, _EPS, 1 - _EPS)
        data: Dict[str, np.ndarray] = {}
        int_set = set(self.schema.int_cols)
        for i, col in enumerate(self._col_order):
            if col in self._numeric_marginals:
                vals = self._numeric_marginals[col].inv_cdf(U[:, i])
                if col in int_set:
                    vals = np.rint(vals).astype("int64")
                data[col] = vals
            else:
                data[col] = self._categorical_marginals[col].inv_cdf_to_value(U[:, i])
        return pd.DataFrame(data, columns=self._col_order)
