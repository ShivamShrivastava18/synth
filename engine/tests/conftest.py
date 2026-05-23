"""Pytest configuration for synth-engine tests.

On macOS, XGBoost requires libomp which may not be in the default library path.
We add scikit-learn's bundled libomp to DYLD_LIBRARY_PATH so that xgboost can
load correctly without requiring a separate brew install libomp step.
"""
import os
import sys


def _ensure_libomp_on_path() -> None:
    """Add scikit-learn's bundled libomp.dylib to DYLD_LIBRARY_PATH if needed."""
    if sys.platform != "darwin":
        return
    try:
        import sklearn
        sklearn_dir = os.path.dirname(sklearn.__file__)
        dylibs_dir = os.path.join(sklearn_dir, ".dylibs")
        libomp_path = os.path.join(dylibs_dir, "libomp.dylib")
        if os.path.exists(libomp_path):
            existing = os.environ.get("DYLD_LIBRARY_PATH", "")
            if dylibs_dir not in existing:
                os.environ["DYLD_LIBRARY_PATH"] = (
                    dylibs_dir + (":" + existing if existing else "")
                )
    except ImportError:
        pass


_ensure_libomp_on_path()
