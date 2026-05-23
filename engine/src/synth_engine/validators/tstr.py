"""Train Synthetic, Test Real (TSTR).

Train XGBoost on synthetic data, evaluate AUC on a 30 % real holdout.
Handles binary, integer-multiclass, and string-multiclass targets.

Subtleties:
- We drop real-test rows whose label is absent from the synthetic training
  set, otherwise XGBoost's output dimensionality cannot cover them.
- The label encoder is fit AFTER that filter, only on labels that survive,
  so the encoded classes are contiguous from 0 (which XGBoost requires).
- We return NaN whenever the metric is undefined (target column missing,
  no usable rows, fewer than two classes in either train or test).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def compute_tstr_auc(synth: pd.DataFrame, real: pd.DataFrame, target_col: str) -> float:
    if target_col not in real.columns or target_col not in synth.columns:
        return float("nan")

    real_train, real_test = train_test_split(real, test_size=0.3, random_state=42)

    X_synth = synth.drop(columns=[target_col]).select_dtypes(include="number").dropna()
    y_synth = synth.loc[X_synth.index, target_col]

    X_real_test = real_test.drop(columns=[target_col]).select_dtypes(include="number")
    X_real_test = X_real_test[X_synth.columns].dropna()
    y_real_test = real_test.loc[X_real_test.index, target_col]

    if len(X_synth) == 0 or len(X_real_test) == 0:
        return float("nan")

    # Normalize labels to strings for object/string dtypes so set intersection works.
    is_string_target = y_synth.dtype == object or pd.api.types.is_string_dtype(y_synth)
    if is_string_target:
        y_synth_arr = y_synth.astype(str).to_numpy()
        y_real_test_arr = y_real_test.astype(str).to_numpy()
    else:
        y_synth_arr = np.asarray(y_synth)
        y_real_test_arr = np.asarray(y_real_test)

    # Drop test rows whose label is absent from synthetic training.
    train_labels = set(np.unique(y_synth_arr).tolist())
    mask = np.isin(y_real_test_arr, list(train_labels))
    if not mask.any():
        return float("nan")
    X_real_test = X_real_test.iloc[mask]
    y_real_test_arr = y_real_test_arr[mask]

    # Need ≥ 2 distinct classes in both train and test for AUC to be defined.
    if len(set(y_synth_arr.tolist())) < 2 or len(set(y_real_test_arr.tolist())) < 2:
        return float("nan")

    # Encode to contiguous integers AFTER filtering. Fit on synth-train labels
    # so the encoder's class set matches what XGBoost will see.
    if is_string_target:
        le = LabelEncoder().fit(y_synth_arr)
        y_synth_enc = le.transform(y_synth_arr)
        y_real_test_enc = le.transform(y_real_test_arr)
    else:
        # Re-encode integer labels too, in case they're sparse (e.g. {0, 2, 5}).
        le = LabelEncoder().fit(y_synth_arr)
        y_synth_enc = le.transform(y_synth_arr)
        y_real_test_enc = le.transform(y_real_test_arr)

    clf = xgb.XGBClassifier(
        n_estimators=50,
        max_depth=4,
        eval_metric="logloss",
        verbosity=0,
    )
    clf.fit(X_synth, y_synth_enc)
    proba = clf.predict_proba(X_real_test)

    if proba.shape[1] == 2:
        return float(roc_auc_score(y_real_test_enc, proba[:, 1]))

    # Weighted average so rare classes (1-2 test samples) don't NaN the metric.
    return float(
        roc_auc_score(
            y_real_test_enc,
            proba,
            multi_class="ovr",
            average="weighted",
            labels=clf.classes_,
        )
    )
