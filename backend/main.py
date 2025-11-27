from pathlib import Path
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    EngineInput, EngineBatch,
    HydraulicsInput, HydraulicsBatch,
    LandingGearInput, LandingGearBatch,
    RULResponse, RULBatchResponse
)
from .models_loader import load_model
from .inference import engine_to_array, hyd_to_array, lg_to_array

APP_DIR = Path(__file__).parent
MODELS_DIR = APP_DIR.parent / "models"

app = FastAPI(title="Aircraft Subsystem RUL API", version="1.0.0")

# ---- Startup debug: print versions and python path ----
@app.on_event("startup")
def _boot_versions():
    try:
        import sys, numpy, pandas, sklearn, scipy, lightgbm  # type: ignore
        print(f"[BOOT] py={sys.executable}")
        print(
            f"[BOOT] numpy={numpy.__version__} pandas={pandas.__version__} "
            f"scipy={scipy.__version__} sklearn={sklearn.__version__} lightgbm={lightgbm.__version__}"
        )
    except Exception as e:
        print(f"[BOOT] version log failed: {e}")

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-friendly; tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "version": app.version}

# --------- ENGINE ---------
@app.post("/predict/engine", response_model=RULResponse)
def predict_engine(payload: EngineInput):
    try:
        model = load_model("engine", MODELS_DIR)
        x = engine_to_array(payload).reshape(1, -1)
        y = float(model.predict(x)[0])
        return RULResponse(predicted_rul=y, model_version="best_model_fd001")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

@app.post("/predict/engine/batch", response_model=RULBatchResponse)
def predict_engine_batch(payload: EngineBatch):
    try:
        model = load_model("engine", MODELS_DIR)
        X = np.vstack([engine_to_array(it) for it in payload.items]).reshape(len(payload.items), -1)
        y = model.predict(X).astype(float).tolist()
        return {"predictions": [{"predicted_rul": v, "units": "cycles", "model_version": "best_model_fd001"} for v in y]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

# --------- HYDRAULICS ---------
@app.post("/predict/hydraulics", response_model=RULResponse)
def predict_hydraulics(payload: HydraulicsInput):
    try:
        model = load_model("hydraulics", MODELS_DIR)
        x = hyd_to_array(payload).reshape(1, -1)
        y = float(model.predict(x)[0])
        return RULResponse(predicted_rul=y, model_version="agg_best_model")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

@app.post("/predict/hydraulics/batch", response_model=RULBatchResponse)
def predict_hydraulics_batch(payload: HydraulicsBatch):
    try:
        model = load_model("hydraulics", MODELS_DIR)
        X = np.vstack([hyd_to_array(it) for it in payload.items]).reshape(len(payload.items), -1)
        y = model.predict(X).astype(float).tolist()
        return {"predictions": [{"predicted_rul": v, "units": "cycles", "model_version": "agg_best_model"} for v in y]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

# --------- LANDING GEAR (3 features user inputs; auto-adapt to model) ---------
@app.post("/predict/landing-gear", response_model=RULResponse)
def predict_landing_gear(payload: LandingGearInput):
    try:
        model = load_model("landing_gear", MODELS_DIR)
        x = lg_to_array(payload).reshape(1, -1)
        y = float(model.predict(x)[0])
        return RULResponse(predicted_rul=y, model_version="best_rul_model_top3")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

@app.post("/predict/landing-gear/batch", response_model=RULBatchResponse)
def predict_landing_gear_batch(payload: LandingGearBatch):
    try:
        model = load_model("landing_gear", MODELS_DIR)
        X = np.vstack([lg_to_array(it) for it in payload.items]).reshape(len(payload.items), -1)
        y = model.predict(X).astype(float).tolist()
        return {"predictions": [{"predicted_rul": v, "units": "cycles", "model_version": "best_rul_model_top3"} for v in y]}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"{type(e).__name__}: {e}")

# --------- DEBUG: what each model expects ---------
@app.get("/model-info")
def model_info():
    info = {}
    for name in ("engine", "hydraulics", "landing_gear"):
        try:
            m = load_model(name, MODELS_DIR)
            info[name] = {
                "type": type(m).__name__,
                "n_features_in_": getattr(m, "n_features_in_", None),
                "feature_names_in_": (
                    getattr(m, "feature_names_in_", None).tolist()
                    if getattr(m, "feature_names_in_", None) is not None else None
                ),
            }
        except Exception as e:
            info[name] = {"load_error": f"{type(e).__name__}: {e}"}
    return info
