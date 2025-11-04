import { useEffect, useState } from "react";
import { getAlerts, type AlertRow } from "../api/client";

export default function AlertsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await getAlerts(100)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alertas</h1>
        <button className="btn" onClick={load} disabled={loading}>Refresh</button>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="text-sm text-slate-500">Aun sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">TS</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Mask</th>
                  <th className="py-2 pr-4">Labels</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="py-2 pr-4">{a.ts.replace("T"," ").slice(0,19)}</td>
                    <td className="py-2 pr-4">{a.device_id}</td>
                    <td className="py-2 pr-4">{a.mask}</td>
                    <td className="py-2 pr-4">{a.labels.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
