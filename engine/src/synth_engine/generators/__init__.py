"""Synth generators — single dispatch entrypoint."""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from synth_engine.schema import Schema

from .gaussian_copula import GaussianCopulaGenerator
from .conditional_histogram import ConditionalHistogramGenerator

_REGISTRY = {
    "gaussian_copula": GaussianCopulaGenerator,
    "conditional_histogram": ConditionalHistogramGenerator,
}


def generate(
    df: pd.DataFrame,
    schema: Schema,
    *,
    engine: str = "gaussian_copula",
    n: int = 50_000,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    if engine not in _REGISTRY:
        raise ValueError(f"unknown engine: {engine!r}; choices: {list(_REGISTRY)}")
    rng = np.random.default_rng(seed)
    gen = _REGISTRY[engine](schema).fit(df)
    return gen.sample(n=n, rng=rng)
