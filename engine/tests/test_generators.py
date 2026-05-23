"""Smoke + shape tests for both generators on synthetic toy data."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from synth_engine.generators import generate
from synth_engine.schema import Schema


@pytest.fixture
def toy_df() -> pd.DataFrame:
    rng = np.random.default_rng(0)
    n = 500
    return pd.DataFrame(
        {
            "age": rng.integers(18, 70, n),
            "income": rng.normal(50_000, 15_000, n),
            "category": rng.choice(["A", "B", "C"], n, p=[0.5, 0.3, 0.2]),
            "status": rng.choice(["active", "inactive"], n),
        }
    )


def test_schema_infers_types(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    assert "age" in schema.numeric_cols
    assert "income" in schema.numeric_cols
    assert "category" in schema.categorical_cols
    assert "status" in schema.categorical_cols
    assert "age" in schema.int_cols
    assert "income" not in schema.int_cols  # float column


def test_gaussian_copula_runs(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="gaussian_copula", n=500, seed=0)
    assert len(synth) == 500
    assert list(synth.columns) == list(toy_df.columns)


def test_gaussian_copula_preserves_categories(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="gaussian_copula", n=1000, seed=1)
    assert set(synth["category"].unique()).issubset({"A", "B", "C"})
    assert set(synth["status"].unique()).issubset({"active", "inactive"})


def test_gaussian_copula_preserves_int_cols(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="gaussian_copula", n=500, seed=0)
    # 'age' must stay integer-valued after generation
    assert (synth["age"] % 1 == 0).all()


def test_gaussian_copula_marginal_mean_close(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="gaussian_copula", n=5000, seed=0)
    # Mean of synthetic 'income' within 10% of real mean
    real_mean = toy_df["income"].mean()
    synth_mean = synth["income"].mean()
    rel = abs(synth_mean - real_mean) / abs(real_mean)
    assert rel < 0.10, f"income mean drift {rel:.3f}"


def test_conditional_histogram_runs(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="conditional_histogram", n=300, seed=2)
    assert len(synth) == 300
    assert set(synth.columns) == set(toy_df.columns)


def test_conditional_histogram_preserves_categories(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    synth = generate(toy_df, schema, engine="conditional_histogram", n=1000, seed=3)
    assert set(synth["category"].unique()).issubset({"A", "B", "C"})


def test_unknown_engine_raises(toy_df: pd.DataFrame) -> None:
    schema = Schema.infer(toy_df)
    with pytest.raises(ValueError, match="unknown engine"):
        generate(toy_df, schema, engine="nope", n=10)
