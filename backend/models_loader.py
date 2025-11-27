from pathlib import Path
import joblib
from typing import Any, List, Optional, Tuple

try:
    from skops.io import load as skops_load
    from skops.io import get_untrusted_types
except Exception:
    skops_load = None
    get_untrusted_types = None


def _unwrap(obj: Any) -> Any:
    """Unwrap dict artifacts like {'model': estimator, ...}."""
    if isinstance(obj, dict):
        for k in ("model", "estimator", "pipeline", "regressor", "clf", "pipe"):
            if k in obj and obj[k] is not None:
                return obj[k]
        if len(obj) == 1:
            return next(iter(obj.values()))
    return obj


def load_model(name: str, models_dir: Path):
    """
    Prefer .skops (and if present but failing, raise that exact error).
    Fall back to .joblib only if no .skops exists.
    Compatible with skops>=0.10 which requires 'trusted' to be a list.
    """
    mapping = {
        "engine":        ["engine.skops", "best_model_fd001.joblib"],
        "scaler_engine": ["scaler_engine.skops", "scaler_fd001.joblib"],
        "hydraulics":    ["hydraulics.skops", "agg_best_model.joblib"],
        "landing_gear":  ["landing_gear.skops", "best_rul_model_top3.skops", "best_rul_model_top3.joblib"],
    }
    candidates: List[str] = mapping.get(name, [])
    if not candidates:
        raise ValueError(f"Unknown model name: {name}")

    errors: List[Tuple[str, str]] = []

    # 1) Try .skops FIRST. If a .skops exists but fails, surface THAT error (do NOT silently fall back).
    skops_candidates = [f for f in candidates if f.endswith(".skops")]
    for fname in skops_candidates:
        p = models_dir / fname
        if not p.exists():
            continue
        try:
            if skops_load is None or get_untrusted_types is None:
                raise RuntimeError("skops is not installed or too old to load this file")
            trusted = get_untrusted_types(p)
            obj = skops_load(p, trusted=trusted)
            return _unwrap(obj)
        except Exception as e:
            errors.append((fname, f"{type(e).__name__}: {e}"))
            # If a .skops is present but failed, stop here and report clearly.
            detail = "\n".join(f"- {fn}: {msg}" for fn, msg in errors)
            raise RuntimeError(
                f"Failed to load SKOPS artifact for '{name}' in {models_dir}:\n{detail}"
            )

    # 2) No .skops loaded/present -> try .joblib
    last_err: Optional[Exception] = None
    for fname in candidates:
        if fname.endswith(".skops"):
            continue
        p = models_dir / fname
        if not p.exists():
            continue
        try:
            obj = joblib.load(p)
            return _unwrap(obj)
        except Exception as e:
            last_err = e
            errors.append((fname, f"{type(e).__name__}: {e}"))
            continue

    # 3) Nothing worked
    tried = ", ".join(candidates)
    detail = "\n".join(f"- {fn}: {msg}" for fn, msg in errors) or "(no candidate files existed)"
    raise FileNotFoundError(
        f"No loadable artifact for '{name}' in {models_dir} (tried: {tried}).\nDetails:\n{detail}"
    )
