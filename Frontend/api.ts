// src/api.ts
import axios, { AxiosError } from "axios";

// ---- Base URL resolution ----
// Priority: env → Vite dev proxy → localhost:5000
const envBase = import.meta.env.VITE_API_BASE as string | undefined;
const usingViteDev = typeof window !== "undefined" && window.location.port === "5173";
const BASE = envBase ?? (usingViteDev ? "/api" : "http://127.0.0.1:5000");

// ---- Axios instance ----
export const api = axios.create({
  baseURL: BASE,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
});

// ---- Helpers ----
const cleanNumber = (v: any) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Deep-coerce numbers in payload to avoid NaN reaching the API
const sanitizePayload = (obj: any) => {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    out[k] =
      typeof v === "number" || typeof v === "string" || v == null
        ? cleanNumber(v)
        : sanitizePayload(v);
  }
  return out;
};

// Extract FastAPI error nicely
const extractError = async (e: AxiosError) => {
  try {
    if (e.response?.data) {
      const data = e.response.data as any;
      if (typeof data === "string") return data;
      if (data.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      return JSON.stringify(data);
    }
  } catch {}
  return e.message || "Request failed";
};

// ---- Types ----
export type RULResponse = { predicted_rul: number; units: string; model_version?: string };
export type BatchResponse = { predictions: RULResponse[] };

// ---- Core POST wrapper ----
async function postJSON<T>(path: string, body: any): Promise<T> {
  try {
    const payload = sanitizePayload(body);
    const res = await api.post<T>(path, payload);
    return res.data;
  } catch (err: any) {
    const msg = await extractError(err);
    throw new Error(msg);
  }
}

// ---- Public API ----
export const postEngine = (payload: any) =>
  postJSON<RULResponse>("/predict/engine", payload);

export const postHydraulics = (payload: any) =>
  postJSON<RULResponse>("/predict/hydraulics", payload);

export const postLandingGear = (payload: any) =>
  postJSON<RULResponse>("/predict/landing-gear", payload);

export const postEngineBatch = (items: any[]) =>
  postJSON<BatchResponse>("/predict/engine/batch", { items });

export const postHydraulicsBatch = (items: any[]) =>
  postJSON<BatchResponse>("/predict/hydraulics/batch", { items });

export const postLandingGearBatch = (items: any[]) =>
  postJSON<BatchResponse>("/predict/landing-gear/batch", { items });

// Optional: quick health check
export const health = async () => {
  try {
    const r = await api.get("/health");
    return r.data;
  } catch (e: any) {
    const msg = await extractError(e);
    throw new Error(msg);
  }
};
