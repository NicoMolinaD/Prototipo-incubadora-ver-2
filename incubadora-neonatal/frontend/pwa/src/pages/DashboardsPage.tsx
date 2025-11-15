import { useEffect, useMemo, useState, useCallback } from "react";
import { getSeries, getDevices, type SeriesPoint } from "../api/client";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { useTheme } from "../contexts/ThemeContext";
import { useBluetooth } from "../contexts/BluetoothContext";

function avg(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => 
    typeof x === "number" && !Number.isNaN(x) && isFinite(x) && x !== null
  );
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function min(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => 
    typeof x === "number" && !Number.isNaN(x) && isFinite(x) && x !== null
  );
  if (!v.length) return null;
  return Math.min(...v);
}

function max(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => 
    typeof x === "number" && !Number.isNaN(x) && isFinite(x) && x !== null
  );
  if (!v.length) return null;
  return Math.max(...v);
}

export default function DashboardsPage() {
  const { colors } = useTheme();
  const { 
    isConnected: bleConnected, 
    dataHistory: bleDataHistory,
    latestData: bleLatestData,
    deviceName: bleDeviceName 
  } = useBluetooth();
  
  const [backendRows, setBackendRows] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hasDevices, setHasDevices] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Combinar datos de Bluetooth y backend
  const allRows = useMemo(() => {
    // Si hay datos de Bluetooth, combinarlos con los del backend
    if (bleDataHistory.length > 0) {
      // Combinar y eliminar duplicados por timestamp
      const combined = [...backendRows, ...bleDataHistory];
      const unique = combined.reduce((acc, current) => {
        const existing = acc.find(item => 
          item.ts === current.ts && item.device_id === current.device_id
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as SeriesPoint[]);
      
      // Ordenar por timestamp
      return unique.sort((a, b) => {
        const dateA = new Date(a.ts).getTime();
        const dateB = new Date(b.ts).getTime();
        return dateA - dateB;
      });
    }
    return backendRows;
  }, [backendRows, bleDataHistory]);

  const fetchBackendData = useCallback(async () => {
    try {
      setError(null);
      
      // Verificar dispositivos vinculados
      const devices = await getDevices();
      console.log("[Dashboards] Dispositivos obtenidos:", devices);
      
      if (devices.length === 0 && !bleConnected) {
        setHasDevices(false);
        setBackendRows([]);
        setDebugInfo("No hay dispositivos vinculados");
        return;
      }
      
      setHasDevices(true);
      const deviceCount = devices.length + (bleConnected ? 1 : 0);
      setDebugInfo(`${deviceCount} dispositivo(s) - ${bleConnected ? 'BLE conectado' : 'Solo backend'}`);
      
      // Obtener datos del backend (últimas 6 horas, máximo 500 puntos)
      const data = await getSeries({ since_minutes: 6 * 60, limit: 500 });
      console.log("[Dashboards] Datos del backend:", data.length, "registros");
      
      const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.ts).getTime();
        const dateB = new Date(b.ts).getTime();
        return dateA - dateB;
      });
      
      setBackendRows(sortedData);
      setLastUpdate(new Date());
      
      if (sortedData.length === 0 && bleDataHistory.length === 0) {
        setError("No hay datos disponibles. Conecta un dispositivo Bluetooth o espera a que se envíen datos.");
        setDebugInfo("No hay datos en los últimos 6 horas");
      } else {
        const totalPoints = sortedData.length + bleDataHistory.length;
        setDebugInfo(`${totalPoints} puntos de datos (${sortedData.length} backend + ${bleDataHistory.length} BLE)`);
      }
    } catch (err: any) {
      console.error("[Dashboards] Error fetching data:", err);
      const errorMessage = err.message || "Error al cargar los datos. Por favor, intenta de nuevo.";
      
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        setLoading(false);
        return;
      }
      
      setError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [bleConnected, bleDataHistory.length]);

  useEffect(() => {
    fetchBackendData();
    // Actualizar datos del backend cada 1 segundo para tiempo real
    const interval = setInterval(() => {
      fetchBackendData();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchBackendData]);

  // Calcular estadísticas usando exactamente los mismos datos que las gráficas (allRows)
  // Filtrar solo los valores válidos y finitos
  const kAire = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_aire_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  }, [allRows]);

  const kPiel = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_piel_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  }, [allRows]);

  const kHum = useMemo(() => {
    const validValues = allRows
      .map((r) => r.humedad)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  }, [allRows]);

  const kPeso = useMemo(() => {
    const validValues = allRows
      .map((r) => r.peso_g)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  }, [allRows]);

  const minAire = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_aire_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.min(...validValues) : null;
  }, [allRows]);

  const maxAire = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_aire_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.max(...validValues) : null;
  }, [allRows]);

  const minPiel = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_piel_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.min(...validValues) : null;
  }, [allRows]);

  const maxPiel = useMemo(() => {
    const validValues = allRows
      .map((r) => r.temp_piel_c)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.max(...validValues) : null;
  }, [allRows]);

  const minHum = useMemo(() => {
    const validValues = allRows
      .map((r) => r.humedad)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.min(...validValues) : null;
  }, [allRows]);

  const maxHum = useMemo(() => {
    const validValues = allRows
      .map((r) => r.humedad)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v) && isFinite(v) && v !== null);
    return validValues.length > 0 ? Math.max(...validValues) : null;
  }, [allRows]);

  const StatCard = ({
    title,
    value,
    unit,
    min,
    max,
    icon,
    color,
  }: {
    title: string;
    value: number | null;
    unit: string;
    min?: number | null;
    max?: number | null;
    icon: string;
    color: string;
  }) => (
    <div
      className="card p-6 hover:shadow-lg transition-shadow duration-200"
      style={{ borderLeft: `4px solid ${color}`, backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {title}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
        {value?.toFixed(1) ?? "--"} <span className="text-lg">{unit}</span>
      </div>
      {(min != null || max != null) && (
        <div className="text-xs" style={{ color: colors.textSecondary }}>
          Min: {min?.toFixed(1) ?? "--"} | Max: {max?.toFixed(1) ?? "--"}
        </div>
      )}
    </div>
  );

  // Mostrar mensaje si no hay dispositivos
  if (!hasDevices && !bleConnected) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Dashboards
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Monitoreo en tiempo real
          </p>
        </div>
        <div className="card p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
            No hay dispositivos vinculados
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Ve a la página de <strong>Dispositivos</strong> para vincular un dispositivo y comenzar a ver los datos aquí.
          </p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de error o sin datos
  if (error && allRows.length === 0 && !loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Dashboards
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              Monitoreo en tiempo real • Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
            {debugInfo && (
              <p className="text-xs mt-1 font-mono" style={{ color: colors.textSecondary }}>
                Debug: {debugInfo}
              </p>
            )}
          </div>
          <button
            onClick={fetchBackendData}
            disabled={loading}
            className="btn px-4 py-2 flex items-center gap-2"
            style={{
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
            }}
          >
            <span>{loading ? "⏳" : "🔄"}</span>
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        <div className="card p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
            Error al cargar datos
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            {error}
          </p>
          {debugInfo && (
            <p className="text-xs mb-4 font-mono" style={{ color: colors.textSecondary }}>
              {debugInfo}
            </p>
          )}
          <button
            onClick={fetchBackendData}
            className="px-4 py-2 rounded-lg font-medium"
            style={{
              backgroundColor: colors.primary,
              color: "white",
              border: "none",
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Dashboards
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Monitoreo en tiempo real • Última actualización: {lastUpdate.toLocaleTimeString()}
            {bleConnected && (
              <span className="ml-2 px-2 py-1 rounded text-xs" style={{ backgroundColor: "#10b981", color: "white" }}>
                🔵 BLE: {bleDeviceName}
              </span>
            )}
          </p>
          {debugInfo && (
            <p className="text-xs mt-1 font-mono" style={{ color: colors.textSecondary }}>
              Debug: {debugInfo}
            </p>
          )}
        </div>
        <button
          onClick={fetchBackendData}
          disabled={loading}
          className="btn px-4 py-2 flex items-center gap-2"
          style={{
            backgroundColor: colors.primary,
            color: "white",
            border: "none",
          }}
        >
          <span>{loading ? "⏳" : "🔄"}</span>
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Temperatura Ambiente"
          value={kAire}
          unit="°C"
          min={minAire}
          max={maxAire}
          icon="🌡️"
          color="#3b82f6"
        />
        <StatCard
          title="Temperatura Piel"
          value={kPiel}
          unit="°C"
          min={minPiel}
          max={maxPiel}
          icon="👤"
          color="#ef4444"
        />
        <StatCard
          title="Humedad"
          value={kHum}
          unit="%"
          min={minHum}
          max={maxHum}
          icon="💧"
          color="#10b981"
        />
        <StatCard
          title="Peso Promedio"
          value={kPeso}
          unit="g"
          icon="⚖️"
          color="#8b5cf6"
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperatura de Piel */}
        <div className="card p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
              Temperatura de Piel
            </h2>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              Evolución temporal de la temperatura corporal
            </p>
          </div>
          <TimeSeriesChart
            data={allRows}
            dataKey="temp_piel_c"
            name="Temperatura Piel"
            unit="°C"
            color="#ef4444"
            height={300}
          />
        </div>

        {/* Temperatura Ambiente */}
        <div className="card p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
              Temperatura Ambiente
            </h2>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              Evolución temporal de la temperatura del habitáculo
            </p>
          </div>
          <TimeSeriesChart
            data={allRows}
            dataKey="temp_aire_c"
            name="Temperatura Ambiente"
            unit="°C"
            color="#3b82f6"
            height={300}
          />
        </div>

        {/* Humedad */}
        <div className="card p-6 lg:col-span-2" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
              Humedad Relativa
            </h2>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              Evolución temporal de la humedad del ambiente
            </p>
          </div>
          <TimeSeriesChart
            data={allRows}
            dataKey="humedad"
            name="Humedad"
            unit="%"
            color="#10b981"
            height={300}
          />
        </div>
      </div>

      {/* Tabla de últimas muestras */}
      <div className="card p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="mb-4">
          <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
            Últimas Muestras
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Registro detallado de las últimas mediciones ({allRows.length} registros)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Timestamp
                </th>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Aire (°C)
                </th>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Piel (°C)
                </th>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Humedad (%)
                </th>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Peso (g)
                </th>
                <th className="py-3 pr-4 text-left font-semibold" style={{ color: colors.textSecondary }}>
                  Alertas
                </th>
              </tr>
            </thead>
            <tbody>
              {allRows.slice(-20).reverse().map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: `1px solid ${colors.border}`,
                  }}
                  className="hover:bg-opacity-50"
                >
                  <td className="py-3 pr-4" style={{ color: colors.text }}>
                    {new Date(r.ts).toLocaleString("es-ES")}
                  </td>
                  <td className="py-3 pr-4" style={{ color: colors.text }}>
                    {r.temp_aire_c?.toFixed(2) ?? "--"}
                  </td>
                  <td className="py-3 pr-4" style={{ color: colors.text }}>
                    {r.temp_piel_c?.toFixed(2) ?? "--"}
                  </td>
                  <td className="py-3 pr-4" style={{ color: colors.text }}>
                    {r.humedad?.toFixed(2) ?? "--"}
                  </td>
                  <td className="py-3 pr-4" style={{ color: colors.text }}>
                    {r.peso_g?.toFixed(0) ?? "--"}
                  </td>
                  <td className="py-3 pr-4">
                    {r.alerts ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        {r.alerts}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        --
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
