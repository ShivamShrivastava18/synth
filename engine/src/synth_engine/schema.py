"""Minimal schema description for generators.

Captures the column-type information generators need without modeling
constraints (Synth always generates unconditionally).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

import pandas as pd


@dataclass
class Schema:
    numeric_cols: List[str]
    categorical_cols: List[str]
    int_cols: List[str] = field(default_factory=list)
    value_ranges: Dict[str, Dict[str, float]] = field(default_factory=dict)

    @classmethod
    def infer(cls, df: pd.DataFrame) -> "Schema":
        numeric = df.select_dtypes(include="number").columns.tolist()
        categorical = [c for c in df.columns if c not in numeric]

        int_cols: List[str] = []
        for c in numeric:
            s = df[c].dropna()
            if pd.api.types.is_integer_dtype(df[c]):
                int_cols.append(c)
            elif len(s) and (s % 1 == 0).all():
                int_cols.append(c)

        value_ranges: Dict[str, Dict[str, float]] = {}
        for c in numeric:
            s = df[c].dropna()
            if len(s):
                value_ranges[c] = {"min": float(s.min()), "max": float(s.max())}

        return cls(
            numeric_cols=numeric,
            categorical_cols=categorical,
            int_cols=int_cols,
            value_ranges=value_ranges,
        )
