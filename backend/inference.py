from pathlib import Path
import json
import numpy as np
from typing import List
from .schemas import EngineInput, HydraulicsInput, LandingGearInput
from .models_loader import load_model

# ---- defaults (optional file) ----
DEFAULTS_PATH = Path(__file__).parent.parent / "models" / "feature_defaults.json"
try:
    FEATURE_DEFAULTS = json.loads(DEFAULTS_PATH.read_text()) if DEFAULTS_PATH.exists() else {}
except Exception:
    FEATURE_DEFAULTS = {}
FEATURE_DEFAULTS.setdefault("engine", {})
FEATURE_DEFAULTS.setdefault("hyd", {})
FEATURE_DEFAULTS.setdefault("lg", {})

# ---------- Feature names ----------
# ENGINE must include sensor_22 so scaler sees 25 total (3 op + 22 sensors)
ENGINE_FEATURES: List[str] = [
    "op_setting_1", "op_setting_2", "op_setting_3",
    *[f"sensor_{i}" for i in range(1, 23)]  # 1..22
]

# HYDRAULICS: your selected 8 key means (we'll adapt to model size if needed)
HYD_FEATURES_8: List[str] = [
    "PS6_mean", "PS5_mean", "CE_mean", "TS4_mean", "TS2_mean", "TS1_mean", "CP_mean", "TS3_mean"
]

# LANDING GEAR: 3 features (your model input)
LG_FEATURES_TOP3: List[str] = [
    "load_during_landing", "tire_pressure", "speed_during_landing"
]

def _impute_row(feature_names, values_dict, defaults_dict):
    out = []
    for f in feature_names:
        v = values_dict.get(f, None)
        if v is None or (isinstance(v, float) and np.isnan(v)):
            v = defaults_dict.get(f, 0.0)
        try:
            out.append(float(v))
        except Exception:
            out.append(0.0)
    arr = np.array(out, dtype=float)
    return np.nan_to_num(arr, nan=0.0, posinf=1e6, neginf=-1e6)

def _adapt_to_model_size(vec: np.ndarray, model_name: str) -> np.ndarray:
    """
    If the saved model expects a different feature count than we send,
    pad with zeros or truncate so inference doesn't crash.
    """
    try:
        model = load_model(model_name, Path(__file__).parent.parent / "models")
        expected = getattr(model, "n_features_in_", None)
        if isinstance(expected, (int, np.integer)) and expected is not None:
            if vec.shape[0] < expected:
                vec = np.pad(vec, (0, expected - vec.shape[0]), mode="constant", constant_values=0.0)
            elif vec.shape[0] > expected:
                vec = vec[:expected]
    except Exception:
        # If model can't be loaded here (e.g., during import), just return original vector.
        pass
    return vec

# ---------- Converters ----------
def engine_to_array(item: EngineInput) -> np.ndarray:
    vals = item.model_dump()
    x = _impute_row(ENGINE_FEATURES, vals, FEATURE_DEFAULTS["engine"]).reshape(1, -1)
    # apply saved scaler for engine
    scaler = load_model("scaler_engine", Path(__file__).parent.parent / "models")
    x_scaled = scaler.transform(x)
    return x_scaled.ravel()

def hyd_to_array(item: HydraulicsInput) -> np.ndarray:
    vals = item.model_dump()
    x = _impute_row(HYD_FEATURES_8, vals, FEATURE_DEFAULTS["hyd"])
    x = _adapt_to_model_size(x, "hydraulics")
    return x.ravel()

def lg_to_array(item: LandingGearInput) -> np.ndarray:
    vals = item.model_dump()
    x = _impute_row(LG_FEATURES_TOP3, vals, FEATURE_DEFAULTS["lg"])
    x = _adapt_to_model_size(x, "landing_gear")
    return x.ravel()
