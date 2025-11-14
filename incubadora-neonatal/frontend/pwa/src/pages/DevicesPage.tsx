import { useEffect, useState } from "react";
import { getDevices, getLatest, getAvailableDevices, linkDevice, unlinkDevice } from "../api/client";
import type { DeviceRow, MeasurementOut } from "../api/types";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useTheme } from "../contexts/ThemeContext";

interface DeviceWithMetrics extends DeviceRow {
  metrics?: MeasurementOut | null;
}

export default function DevicesPage() {
  const { colors } = useTheme();
  const { isConnected: bleConnected, connect: connectBLE, disconnect: disconnectBLE, deviceName } = useBluetooth();
  
  const [rows, setRows] = useState<DeviceWithMetrics[]>([]);
  const [availableDevices, setAvailableDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const devices = await getDevices();
      const enriched = await Promise.all(
        devices.map(async (d: { id: string }) => {
          let metrics: MeasurementOut | null = null;
          try {
            metrics = await getLatest(d.id);
          } catch {
            // ignore errors (e.g. no measurements yet)
          }
          return { ...d, metrics };
        })
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

  // Cargar datos iniciales y actualizar en tiempo real cada 5 segundos
  useEffect(() => {
    load();
    loadAvailable();
    
    // Actualizar en tiempo real
    const interval = setInterval(() => {
      load();
      loadAvailable();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: colors.text }}>
            Dispositivos
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Gestiona tus dispositivos y conexiones Bluetooth
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn text-sm px-4 py-2"
            onClick={() => {
              setShowAvailable(!showAvailable);
              if (!showAvailable) loadAvailable();
            }}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            {showAvailable ? "Mis Dispositivos" : "Dispositivos Disponibles"}
          </button>
          <button
            className="btn text-sm px-4 py-2"
            onClick={load}
            disabled={loading}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Estado de conexión Bluetooth */}
      <div className="card p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${bleConnected ? "bg-green-500" : "bg-gray-400"}`} />
            <div>
              <div className="font-medium" style={{ color: colors.text }}>
                {bleConnected ? `Conectado: ${deviceName || "Dispositivo Bluetooth"}` : "No conectado"}
              </div>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                {bleConnected
                  ? "La conexión Bluetooth permanece activa entre páginas"
                  : "Conecta un dispositivo Bluetooth para controlar la incubadora"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!bleConnected ? (
              <button
                onClick={connectBLE}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: colors.primary,
                  color: "white",
                  border: "none",
                }}
              >
                Conectar Bluetooth
              </button>
            ) : (
              <button
                onClick={disconnectBLE}
                className="px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                }}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
      </div>

      {showAvailable ? (
        <div className="card p-4 md:p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{ color: colors.text }}>
            Dispositivos Disponibles
          </h2>
          {loading ? (
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Cargando...
            </div>
          ) : availableDevices.length === 0 ? (
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              No hay dispositivos disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                      Device ID
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                      Última vez visto
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                      Estado
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availableDevices.map((d) => (
                    <tr key={d.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td className="py-3 pr-4 font-mono text-xs sm:text-sm" style={{ color: colors.text }}>
                        {d.id}
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell text-xs" style={{ color: colors.textSecondary }}>
                        {d.last_seen ? d.last_seen.replace("T", " ").slice(0, 19) : "--"}
                      </td>
                      <td className="py-3 pr-4">
                        {d.is_linked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Vinculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {d.is_linked ? (
                          <button
                            className="px-3 py-1 rounded text-xs font-medium transition-all hover:shadow"
                            style={{
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                            }}
                            onClick={() => handleUnlink(d.id)}
                          >
                            Desvincular
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1 rounded text-xs font-medium transition-all hover:shadow"
                            style={{
                              backgroundColor: colors.primary,
                              color: "white",
                              border: "none",
                            }}
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
        <div className="card p-4 md:p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h2 className="text-lg sm:text-xl font-semibold mb-4" style={{ color: colors.text }}>
            Mis Dispositivos Vinculados
          </h2>
          {loading ? (
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Cargando...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm" style={{ color: colors.textSecondary }}>
              Aún no tienes dispositivos vinculados. Ve a "Dispositivos Disponibles" para vincular uno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                      Device ID
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden sm:table-cell" style={{ color: colors.textSecondary }}>
                      Última vez visto
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden md:table-cell" style={{ color: colors.textSecondary }}>
                      Aire (C)
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden md:table-cell" style={{ color: colors.textSecondary }}>
                      Piel (C)
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden lg:table-cell" style={{ color: colors.textSecondary }}>
                      H (%)
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold hidden lg:table-cell" style={{ color: colors.textSecondary }}>
                      Peso (g)
                    </th>
                    <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td className="py-3 pr-4 font-mono text-xs sm:text-sm" style={{ color: colors.text }}>
                        {d.name || d.id}
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell text-xs" style={{ color: colors.textSecondary }}>
                        {d.last_seen ? d.last_seen.replace("T", " ").slice(0, 19) : "--"}
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell" style={{ color: colors.text }}>
                        {d.metrics?.temp_aire_c?.toFixed(1) ?? "--"}
                      </td>
                      <td className="py-3 pr-4 hidden md:table-cell" style={{ color: colors.text }}>
                        {d.metrics?.temp_piel_c?.toFixed(1) ?? "--"}
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell" style={{ color: colors.text }}>
                        {d.metrics?.humedad?.toFixed(1) ?? "--"}
                      </td>
                      <td className="py-3 pr-4 hidden lg:table-cell" style={{ color: colors.text }}>
                        {d.metrics?.peso_g?.toFixed(0) ?? "--"}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          className="px-3 py-1 rounded text-xs font-medium transition-all hover:shadow"
                          style={{
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                          }}
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
