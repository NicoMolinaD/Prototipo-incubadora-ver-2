import { useEffect, useState } from "react";
import { getDevices, type DeviceRow } from "../api/client";

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await getDevices());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dispositivos</h1>
        <button className="btn" onClick={load} disabled={loading}>Refresh</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-sm text-slate-500">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">Aun sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Device ID</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2 pr-4">Aire (C)</th>
                  <th className="py-2 pr-4">Piel (C)</th>
                  <th className="py-2 pr-4">H (%)</th>
                  <th className="py-2 pr-4">Peso (g)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.device_id} className="border-t border-slate-200">
                    <td className="py-2 pr-4">{d.device_id}</td>
                    <td className="py-2 pr-4">{d.last_seen?.replace("T"," ").slice(0,19) ?? "--"}</td>
                    <td className="py-2 pr-4">{d.metrics.temp_aire_c ?? "--"}</td>
                    <td className="py-2 pr-4">{d.metrics.temp_piel_c ?? "--"}</td>
                    <td className="py-2 pr-4">{d.metrics.humedad ?? "--"}</td>
                    <td className="py-2 pr-4">{d.metrics.peso_g ?? "--"}</td>
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
