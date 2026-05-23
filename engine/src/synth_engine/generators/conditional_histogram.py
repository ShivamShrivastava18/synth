"""Per-column empirical histogram sampler (unconditional).

For each column, draw values from the empirical distribution of the source.
Categorical columns sample by observed frequency; numeric columns sample with
replacement from observed values, snapping integer columns to nearest int.

Adapted from AI-Agent-for-Synthetic-Data-Generation; constraint-handling
machinery was stripped. Despite the name we keep, the "conditional" part
refers to the original constraint use case — here we simply sample
per-column marginals independently.
"""
from __future__ import annotations

from typing import Dict

import numpy as np
import pandas as pd

from synth_engine.schema import Schema


class ConditionalHistogramGenerator:
    name = "conditional_histogram"

    def __init__(self, schema: Schema) -> None:
        self.schema = schema
        self._df: pd.DataFrame | None = None
        self._modes: Dict[str, object] = {}
        self._fitted = False

    def fit(self, df: pd.DataFrame) -> "ConditionalHistogramGenerator":
        self._df = df.copy()
        for col in df.columns:
            if col in self.schema.numeric_cols:
                self._modes[col] = float(
                    pd.to_numeric(df[col], errors="coerce").median()
                )
            else:
                m = df[col].mode(dropna=True)
                self._modes[col] = m.iloc[0] if len(m) else ""
        self._fitted = True
        return self

    def sample(self, n: int, rng: np.random.Generator) -> pd.DataFrame:
        assert self._df is not None and self._fitted
        int_set = set(self.schema.int_cols)
        out: Dict[str, np.ndarray] = {}
        for col in self._df.columns:
            s = self._df[col].dropna()
            if s.empty:
                # Fully-null column — fill with mode (likely 0 or "")
                out[col] = np.array([self._modes[col]] * n, dtype=object)
                continue

            sampled = rng.choice(s.to_numpy(), size=n, replace=True)
            if col in self.schema.numeric_cols:
                sampled = pd.to_numeric(sampled, errors="coerce")
                sampled = np.where(
                    np.isnan(sampled.astype(float)), self._modes[col], sampled
                )
                if col in int_set:
                    sampled = np.rint(sampled).astype("int64")
            out[col] = sampled

        return pd.DataFrame(out, columns=list(self._df.columns))
