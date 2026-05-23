"""Train Synthetic, Test Real (TSTR). XGBoost classifier trained on synthetic,
evaluated AUC on real holdout."""
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
import xgboost as xgb


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
    clf = xgb.XGBClassifier(
        n_estimators=50, max_depth=4, eval_metric="logloss", verbosity=0,
    )
    clf.fit(X_synth, y_synth)
    proba = clf.predict_proba(X_real_test)
    # Binary or multiclass
    if proba.shape[1] == 2:
        return float(roc_auc_score(y_real_test, proba[:, 1]))
    return float(roc_auc_score(y_real_test, proba, multi_class="ovr"))
