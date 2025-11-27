This folder contains all datasets used to develop the machine learning models for **aircraft subsystem health prediction**, covering three major subsystems:

1. Engine
2. Hydraulics
3. Landing Gear

Each subsystem required a separate dataset and model due to differences in sensor types, failure modes, and data characteristics.

---

## 1. Engine Subsystem (FD001 – NASA C-MAPSS)

**Source:** NASA Prognostics Center of Excellence  
**Dataset:** C-MAPSS Turbofan Engine Degradation Simulation – FD001

The FD001 dataset contains multivariate time-series sensor data for turbofan engines operating under a single operating condition. It includes:

- 21 sensor measurements  
- Engine operational settings  
- Run-to-failure sequences  
- Remaining Useful Life (RUL) ground-truth labels

### Preprocessing steps applied:
- Removal of constant or non-informative sensors  
- Normalization (Min-Max or Z-score)  
- Sequence windowing for LSTM/GRU models  
- RUL label smoothing/truncation (optional)  

Files for this dataset are stored in:
data/engine/


## 2. Hydraulics Subsystem
**Source:** External dataset (imported from an online aircraft system monitoring repository).
### Dataset characteristics:
- Multivariate sensor readings  
- Labels indicating normal operation vs. degradation/fault  
- Includes noise and missing values that required cleaning

### Preprocessing steps applied:
- Handling missing values  
- Statistical feature extraction  
- Outlier removal  
- Normalization/scaling  

Files for this dataset are stored in:
data/hydraulics/



## 3. Landing Gear Subsystem
**Source:** External aviation maintenance dataset (imported from a public data repository). 
### Dataset characteristics:
- Event-driven and time-series telemetry  
- Labels for gear deployment faults or anomalies  
- Significant noise requiring filtering

### Preprocessing steps applied:
- Resampling uneven time-series  
- Noise reduction (moving average filtering)  
- Feature engineering (vibration statistics, temperature deltas)  
- One-hot encoding for categorical status variables  

Files for this dataset are stored in:
data/landing_gear/



##  General Data Processing Notes

Across all datasets, the following steps were applied:

- Cleaning corrupted or incomplete rows  
- Standardizing units and naming conventions  
- Splitting into train/validation/test sets  
