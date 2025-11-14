import { useEffect, useState } from "react";
import { getDevices, getLatest, getAvailableDevices, linkDevice, unlinkDevice } from "../api/client";
import type { DeviceRow, MeasurementOut } from "../api/types";

/**
 * DevicesPage lists all registered devices and displays the most recent
 * telemetry for each one.  The metrics are fetched on demand using
 * getLatest() for each device.
 * Now includes functionality to link/unlink devices.
 */
interface DeviceWithMetrics extends DeviceRow {
  metrics?: MeasurementOut | null;
  // Sobrescribir metrics para permitir MeasurementOut
}

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceWithMetrics[]>([]);
  const [availableDevices, setAvailableDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

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

  async function loadAvailable() {
    setLoading(true);
    try {
      const devices = await getAvailableDevices();
      setAvailableDevices(devices);
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(deviceId: string) {
    try {
      await linkDevice(deviceId);
      await load();
      await loadAvailable();
      alert("Dispositivo vinculado exitosamente");
    } catch (error: any) {
      alert(`Error al vincular: ${error.message || "Dispositivo ya vinculado a otro usuario"}`);
    }
  }

  async function handleUnlink(deviceId: string) {
    if (!confirm("¿Está seguro de que desea desvincular este dispositivo?")) {
      return;
    }
    try {
      await unlinkDevice(deviceId);
      await load();
      await loadAvailable();
      alert("Dispositivo desvinculado exitosamente");
    } catch (error: any) {
      alert(`Error al desvincular: ${error.message || "Error desconocido"}`);
    }
  }

  useEffect(() => {
    load();
    loadAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dispositivos</h1>
        <div className="flex gap-2">
          <button 
            className="btn text-sm px-4 py-2" 
            onClick={() => {
              setShowAvailable(!showAvailable);
              if (!showAvailable) loadAvailable();
            }}
          >
            {showAvailable ? "Mis Dispositivos" : "Dispositivos Disponibles"}
          </button>
          <button className="btn text-sm px-4 py-2" onClick={load} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {showAvailable ? (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Dispositivos Disponibles</h2>
          {loading ? (
            <div className="text-sm text-slate-500">Cargando...</div>
          ) : availableDevices.length === 0 ? (
            <div className="text-sm text-slate-500">No hay dispositivos disponibles</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Device ID</th>
                    <th className="py-2 pr-4 hidden sm:table-cell">Última vez visto</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {availableDevices.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="py-2 pr-4 font-mono text-xs sm:text-sm">{d.id}</td>
                      <td className="py-2 pr-4 hidden sm:table-cell text-xs">
                        {d.last_seen
                          ? d.last_seen.replace("T", " ").slice(0, 19)
                          : "--"}
                      </td>
                      <td className="py-2 pr-4">
                        {d.is_linked ? (
                          <span className="text-green-600 text-xs sm:text-sm">Vinculado</span>
                        ) : (
                          <span className="text-slate-400 text-xs sm:text-sm">Disponible</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {d.is_linked ? (
                          <button
                            className="btn text-xs px-2 py-1 bg-red-500 hover:bg-red-600"
                            onClick={() => handleUnlink(d.id)}
                          >
                            Desvincular
                          </button>
                        ) : (
                          <button
                            className="btn text-xs px-2 py-1 bg-green-500 hover:bg-green-600"
                            onClick={() => handleLink(d.id)}
                          >
                            Vincular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Mis Dispositivos Vinculados</h2>
          {loading ? (
            <div className="text-sm text-slate-500">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">
              Aún no tienes dispositivos vinculados. Ve a "Dispositivos Disponibles" para vincular uno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Device ID</th>
                    <th className="py-2 pr-4 hidden sm:table-cell">Última vez visto</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Aire (C)</th>
                    <th className="py-2 pr-4 hidden md:table-cell">Piel (C)</th>
                    <th className="py-2 pr-4 hidden lg:table-cell">H (%)</th>
                    <th className="py-2 pr-4 hidden lg:table-cell">Peso (g)</th>
                    <th className="py-2 pr-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className="border-b border-slate-200">
                      <td className="py-2 pr-4 font-mono text-xs sm:text-sm">
                        {d.name || d.id}
                      </td>
                      <td className="py-2 pr-4 hidden sm:table-cell text-xs">
                        {d.last_seen
                          ? d.last_seen.replace("T", " ").slice(0, 19)
                          : "--"}
                      </td>
                      <td className="py-2 pr-4 hidden md:table-cell">
                        {d.metrics?.temp_aire_c ?? "--"}
                      </td>
                      <td className="py-2 pr-4 hidden md:table-cell">
                        {d.metrics?.temp_piel_c ?? "--"}
                      </td>
                      <td className="py-2 pr-4 hidden lg:table-cell">
                        {d.metrics?.humedad ?? "--"}
                      </td>
                      <td className="py-2 pr-4 hidden lg:table-cell">
                        {d.metrics?.peso_g ?? "--"}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          className="btn text-xs px-2 py-1 bg-red-500 hover:bg-red-600"
                          onClick={() => handleUnlink(d.id)}
                        >
                          Desvincular
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
