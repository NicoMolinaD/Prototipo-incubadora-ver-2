import { useEffect, useMemo, useState } from "react";
import { getSeries, type SeriesPoint } from "../api/client";

function avg(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a,b)=>a+b,0)/v.length;
}

export default function DashboardsPage() {
  const [rows, setRows] = useState<SeriesPoint[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const data = await getSeries({ since_minutes: 6*60, limit: 2000 });
      if (!cancel) setRows(data.reverse()); // asc
    })();
    return () => { cancel = true; };
  }, []);

  const kAire = useMemo(()=>avg(rows.map(r=>r.temp_aire_c)),[rows]);
  const kPiel = useMemo(()=>avg(rows.map(r=>r.temp_piel_c)),[rows]);
  const kHum  = useMemo(()=>avg(rows.map(r=>r.humedad)),[rows]);
  const kPeso = useMemo(()=>avg(rows.map(r=>r.peso_g)),[rows]);

  const meta = (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card"><div className="text-xs text-slate-500">Aire (C) avg</div><div className="text-2xl font-semibold">{kAire?.toFixed(1) ?? "--"}</div></div>
      <div className="card"><div className="text-xs text-slate-500">Piel (C) avg</div><div className="text-2xl font-semibold">{kPiel?.toFixed(1) ?? "--"}</div></div>
      <div className="card"><div className="text-xs text-slate-500">H (%) avg</div><div className="text-2xl font-semibold">{kHum?.toFixed(1) ?? "--"}</div></div>
      <div className="card"><div className="text-xs text-slate-500">Peso (g) avg</div><div className="text-2xl font-semibold">{kPeso?.toFixed(0) ?? "--"}</div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboards</h1>
      {meta}

      <div className="card">
        <div className="text-lg font-medium mb-3">Ultimas muestras (tabla)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">TS</th>
                <th className="py-2 pr-4">Aire (C)</th>
                <th className="py-2 pr-4">Piel (C)</th>
                <th className="py-2 pr-4">H (%)</th>
                <th className="py-2 pr-4">Peso (g)</th>
                <th className="py-2 pr-4">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(-50).map((r, i) => (
                <tr key={i} className="border-top border-slate-200">
                  <td className="py-2 pr-4">{r.ts.replace("T"," ").slice(0,19)}</td>
                  <td className="py-2 pr-4">{r.temp_aire_c ?? "--"}</td>
                  <td className="py-2 pr-4">{r.temp_piel_c ?? "--"}</td>
                  <td className="py-2 pr-4">{r.humedad ?? "--"}</td>
                  <td className="py-2 pr-4">{r.peso_g ?? "--"}</td>
                  <td className="py-2 pr-4">{r.alerts ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
