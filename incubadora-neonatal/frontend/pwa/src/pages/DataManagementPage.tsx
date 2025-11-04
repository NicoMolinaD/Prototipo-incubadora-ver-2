import { useEffect, useState } from "react";
import { getSeries, type SeriesPoint } from "../api/client";

export default function DataManagementPage() {
  const [rows, setRows] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows((await getSeries({ since_minutes: 24*60, limit: 500 })).reverse()); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Data Management</h1>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600">
            Ultimos eventos (vista simple). Filtrado y tags se agregan luego.
          </div>
          <button className="btn" onClick={load} disabled={loading}>Refresh</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">TS</th>
                <th className="py-2 pr-4">Aire (C)</th>
                <th className="py-2 pr-4">Piel (C)</th>
                <th className="py-2 pr-4">H (%)</th>
                <th className="py-2 pr-4">Luz</th>
                <th className="py-2 pr-4">Peso (g)</th>
                <th className="py-2 pr-4">Alerts</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(-100).map((r, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="py-2 pr-4">{r.ts.replace("T"," ").slice(0,19)}</td>
                  <td className="py-2 pr-4">{r.temp_aire_c ?? "--"}</td>
                  <td className="py-2 pr-4">{r.temp_piel_c ?? "--"}</td>
                  <td className="py-2 pr-4">{r.humedad ?? "--"}</td>
                  <td className="py-2 pr-4">{r.luz ?? "--"}</td>
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
