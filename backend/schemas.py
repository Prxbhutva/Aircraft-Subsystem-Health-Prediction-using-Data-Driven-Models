from typing import List
from pydantic import BaseModel, ConfigDict

# --------- Inputs ---------
class EngineInput(BaseModel):
    op_setting_1: float
    op_setting_2: float
    op_setting_3: float
    sensor_4: float
    sensor_11: float
    sensor_12: float

class HydraulicsInput(BaseModel):
    PS6_mean: float
    PS5_mean: float
    CE_mean: float
    TS4_mean: float
    TS2_mean: float
    TS1_mean: float
    CP_mean: float
    TS3_mean: float

class LandingGearInput(BaseModel):
    load_during_landing: float
    tire_pressure: float
    speed_during_landing: float

# --------- Batches ---------
class EngineBatch(BaseModel):
    items: List[EngineInput]

class HydraulicsBatch(BaseModel):
    items: List[HydraulicsInput]

class LandingGearBatch(BaseModel):
    items: List[LandingGearInput]

# --------- Responses ---------
class RULResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_rul: float
    units: str = "cycles"
    model_version: str | None = None

class RULBatchResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predictions: List[RULResponse]
