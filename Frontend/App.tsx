import { useMemo, useState } from "react";
import Field from "./components/Field";
import CSVUpload from "./components/CSVUpload";
import {
  postEngine, postHydraulics, postLandingGear,
  postEngineBatch, postHydraulicsBatch, postLandingGearBatch
} from "./api";
import CombinedDashboard from "./components/CombinedDashboard";
import { ResultsChart, ResultsTable } from "./components/Results";
import { Gauge, Cog, BarChart2, Activity, Upload, Rocket } from "lucide-react";
import "./index.css";

type Tab = "engine" | "hyd" | "lg" | "dashboard";

export default function App() {
  const [tab, setTab] = useState<Tab>("engine");

  // batch tables for dashboard + KPIs
  const [engineBatchRows, setEngineBatchRows] = useState<any[]>([]);
  const [hydBatchRows, setHydBatchRows] = useState<any[]>([]);
  const [lgBatchRows, setLgBatchRows] = useState<any[]>([]);

  // last single predictions for KPI cards
  const [kpi, setKpi] = useState<{engine?: number; hyd?: number; lg?: number}>({});

  const apiBase = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="aside">
        <div className="brand">
          <div className="brand-mark">RUL</div>
          <div className="brand-title">Aircraft Predictor</div>
        </div>
        <nav className="nav">
          <button className={`nav-btn ${tab==="engine" ? "nav-btn-active":""}`} onClick={()=>setTab("engine")}>
            <Gauge size={16}/> Engine
          </button>
          <button className={`nav-btn ${tab==="hyd" ? "nav-btn-active":""}`} onClick={()=>setTab("hyd")}>
            <Cog size={16}/> Hydraulics
          </button>
          <button className={`nav-btn ${tab==="lg" ? "nav-btn-active":""}`} onClick={()=>setTab("lg")}>
            <LandingGearIcon/> Landing Gear
          </button>
          <button className={`nav-btn ${tab==="dashboard" ? "nav-btn-active":""}`} onClick={()=>setTab("dashboard")}>
            <BarChart2 size={16}/> Dashboard
          </button>
        </nav>
      </aside>

      {/* Main */}
      <section className="main">
        <div className="topbar">
          <div className="header">
            <div>
              <div className="header-title">Subsystem RUL Console</div>
              <div className="accent-bar mt-3" />
            </div>
            <div className="badge">
              <Activity size={14}/> API: {apiBase}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="px-6 py-6">
          <div className="kpis">
            <KPI title="Engine RUL (last)" value={kpi.engine} />
            <KPI title="Hydraulics RUL (last)" value={kpi.hyd} />
            <KPI title="Landing Gear RUL (last)" value={kpi.lg} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-10 grid gap-6">
          {tab==="engine" && <EnginePanel setBatchRows={setEngineBatchRows} onKPI={(v)=>setKpi(s=>({...s,engine:v}))} />}
          {tab==="hyd" && <HydraulicsPanel setBatchRows={setHydBatchRows} onKPI={(v)=>setKpi(s=>({...s,hyd:v}))} />}
          {tab==="lg" && <LandingGearPanel setBatchRows={setLgBatchRows} onKPI={(v)=>setKpi(s=>({...s,lg:v}))} />}
          {tab==="dashboard" && (
            <div className="card">
              <CombinedDashboard engineRows={engineBatchRows} hydRows={hydBatchRows} lgRows={lgBatchRows} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- KPI Card ---------- */
function KPI({ title, value }: {title: string; value?: number}) {
  const v = useMemo(() => (typeof value === "number" ? value.toFixed(2) : "—"), [value]);
  return (
    <div className="kpi">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value mt-1">{v}</div>
    </div>
  );
}

/* ---------- ENGINE ---------- */
function EnginePanel({ setBatchRows, onKPI }: { setBatchRows: (rows:any[])=>void; onKPI: (v:number)=>void }) {
  const keys = ["op_setting_1","op_setting_2","op_setting_3","sensor_11","sensor_4","sensor_12"];
  const [form, setForm] = useState<any>({ op_setting_1: 0, op_setting_2: 0, op_setting_3: 100, sensor_11: 47, sensor_4: 1400, sensor_12: 520 });
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batchRows, setLocalBatch] = useState<any[]>([]);
  const setAny = (k: string) => (v: any) => setForm((s:any)=>({...s,[k]: typeof v==="number"? v : Number(v)}));

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Engine — Single Prediction</h3>
          <div className="badge"><Rocket size={14}/> Predict</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keys.map(k => <Field key={k} label={k} value={form[k]} onChange={setAny(k)} />)}
        </div>
        <button className="btn mt-3" disabled={loading}
          onClick={async()=>{ 
            setLoading(true); 
            try { 
              const r = await postEngine(form); 
              setRes(r); 
              if (typeof r?.predicted_rul === "number") onKPI(r.predicted_rul);
            } finally { setLoading(false); }
          }}>
          {loading ? <span className="spinner" /> : null} {loading ? "Predicting..." : "Predict RUL"}
        </button>
        {res && <div className="mt-3 text-sm">Predicted RUL: <b>{res.predicted_rul.toFixed(2)}</b> {res.units}</div>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Engine — Batch Prediction</h3>
          <span className="badge"><Upload size={14}/> CSV</span>
        </div>
        <CSVUpload
          label="Upload CSV and run predictions"
          expectedHeaders={keys}
          exampleName="engine_batch_template"
          onSubmit={async (rows) => postEngineBatch(rows)}
          onResults={(merged) => { setLocalBatch(merged); setBatchRows(merged); }}
        />
      </div>

      {batchRows.length > 0 && (
        <>
          <div className="chart-card"><ResultsChart rows={batchRows} /></div>
          <div className="card"><ResultsTable rows={batchRows} /></div>
        </>
      )}
    </>
  );
}

/* ---------- HYDRAULICS ---------- */
function HydraulicsPanel({ setBatchRows, onKPI }: { setBatchRows: (rows:any[])=>void; onKPI: (v:number)=>void }) {
  const keys = ["PS6_mean","PS5_mean","CE_mean","TS4_mean","TS2_mean","TS1_mean","CP_mean","TS3_mean"];
  const [form, setForm] = useState<any>({ PS6_mean: 10, PS5_mean: 9.5, CE_mean: 31, TS4_mean: 52, TS2_mean: 47, TS1_mean: 45, CP_mean: 1.8, TS3_mean: 48 });
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batchRows, setLocalBatch] = useState<any[]>([]);
  const setAny = (k: string) => (v: any) => setForm((s:any)=>({...s,[k]: typeof v==="number"? v : Number(v)}));

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Hydraulics — Single Prediction</h3>
          <div className="badge"><Rocket size={14}/> Predict</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keys.map(k => <Field key={k} label={k} value={form[k]} onChange={setAny(k)} />)}
        </div>
        <button className="btn mt-3" disabled={loading}
          onClick={async()=>{ 
            setLoading(true); 
            try { 
              const r = await postHydraulics(form); 
              setRes(r); 
              if (typeof r?.predicted_rul === "number") onKPI(r.predicted_rul);
            } finally { setLoading(false); }
          }}>
          {loading ? <span className="spinner" /> : null} {loading ? "Predicting..." : "Predict RUL"}
        </button>
        {res && <div className="mt-3 text-sm">Predicted RUL: <b>{res.predicted_rul.toFixed(2)}</b> {res.units}</div>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Hydraulics — Batch Prediction</h3>
          <span className="badge"><Upload size={14}/> CSV</span>
        </div>
        <CSVUpload
          label="Upload CSV and run predictions"
          expectedHeaders={keys}
          exampleName="hydraulics_batch_template"
          onSubmit={async (rows) => postHydraulicsBatch(rows)}
          onResults={(merged) => { setLocalBatch(merged); setBatchRows(merged); }}
        />
      </div>

      {batchRows.length > 0 && (
        <>
          <div className="chart-card"><ResultsChart rows={batchRows} /></div>
          <div className="card"><ResultsTable rows={batchRows} /></div>
        </>
      )}
    </>
  );
}

/* ---------- LANDING GEAR ---------- */
function LandingGearPanel({ setBatchRows, onKPI }: { setBatchRows: (rows:any[])=>void; onKPI: (v:number)=>void }) {
  const keys = ["load_during_landing","tire_pressure","speed_during_landing"];
  const [form, setForm] = useState<any>({ load_during_landing: 75, tire_pressure: 32.5, speed_during_landing: 160 });
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [batchRows, setLocalBatch] = useState<any[]>([]);
  const setAny = (k: string) => (v: any) => setForm((s:any)=>({...s,[k]: typeof v==="number"? v : Number(v)}));

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Landing Gear — Single Prediction</h3>
          <div className="badge"><Rocket size={14}/> Predict</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keys.map(k => <Field key={k} label={k} value={form[k]} onChange={setAny(k)} />)}
        </div>
        <button className="btn mt-3" disabled={loading}
          onClick={async()=>{ 
            setLoading(true); 
            try { 
              const r = await postLandingGear(form); 
              setRes(r); 
              if (typeof r?.predicted_rul === "number") onKPI(r.predicted_rul);
            } finally { setLoading(false); }
          }}>
          {loading ? <span className="spinner" /> : null} {loading ? "Predicting..." : "Predict RUL"}
        </button>
        {res && <div className="mt-3 text-sm">Predicted RUL: <b>{res.predicted_rul.toFixed(2)}</b> {res.units}</div>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Landing Gear — Batch Prediction</h3>
          <span className="badge"><Upload size={14}/> CSV</span>
        </div>
        <CSVUpload
          label="Upload CSV and run predictions"
          expectedHeaders={keys}
          exampleName="landing_gear_batch_template"
          onSubmit={async (rows) => postLandingGearBatch(rows)}
          onResults={(merged) => { setLocalBatch(merged); setBatchRows(merged); }}
        />
      </div>

      {batchRows.length > 0 && (
        <>
          <div className="chart-card"><ResultsChart rows={batchRows} /></div>
          <div className="card"><ResultsTable rows={batchRows} /></div>
        </>
      )}
    </>
  );
}

/* ---------- Custom icon ---------- */
function LandingGearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline-block">
      <path d="M4 4h16v3H4zM11 7h2v5h-2zM8 12h8l3 4H5zM7 18h10v2H7z"></path>
    </svg>
  );
}
