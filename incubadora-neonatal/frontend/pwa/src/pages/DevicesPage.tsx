import { useEffect, useState } from "react";
import { getDevices, getLatest } from "../api/client";
import type { DeviceRow, MeasurementOut } from "../api/types";

/**
 * DevicesPage lists all registered devices and displays the most recent
 * telemetry for each one.  The metrics are fetched on demand using
 * getLatest() for each device.
 */
interface DeviceWithMetrics extends DeviceRow {
  metrics?: MeasurementOut | null;
}

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceWithMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const devices = await getDevices();
      const enriched = await Promise.all(
        devices.map(async (d: { id: string; }) => {
          let metrics: MeasurementOut | null = null;
          try {
            metrics = await getLatest(d.id);
          } catch {
            // ignore errors (e.g. no measurements yet)
          }
          return { ...d, metrics };
        }),
      );
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dispositivos</h1>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="text-sm text-slate-500">Cargando?</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-500">Aún sin datos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Device ID</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2 pr-4">Aire (C)</th>
                  <th className="py-2 pr-4">Piel (C)</th>
                  <th className="py-2 pr-4">H (%)</th>
                  <th className="py-2 pr-4">Peso (g)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200">
                    <td className="py-2 pr-4">{d.id}</td>
                    <td className="py-2 pr-4">
                      {d.last_seen
                        ? d.last_seen.replace("T", " ").slice(0, 19)
                        : "--"}
                    </td>
                    <td className="py-2 pr-4">
                      {d.metrics?.temp_aire_c ?? "--"}
                    </td>
                    <td className="py-2 pr-4">
                      {d.metrics?.temp_piel_c ?? "--"}
                    </td>
                    <td className="py-2 pr-4">
                      {d.metrics?.humedad ?? "--"}
                    </td>
                    <td className="py-2 pr-4">
                      {d.metrics?.peso_g ?? "--"}
                    </td>
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
