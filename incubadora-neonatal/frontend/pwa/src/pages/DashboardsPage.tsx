import { useEffect, useMemo, useState, useCallback } from "react";
import { getSeries, getDevices, type SeriesPoint } from "../api/client";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { useTheme } from "../contexts/ThemeContext";

function avg(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function min(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return Math.min(...v);
}

function max(xs: (number | null | undefined)[]) {
  const v = xs.filter((x): x is number => typeof x === "number" && !Number.isNaN(x));
  if (!v.length) return null;
  return Math.max(...v);
}

export default function DashboardsPage() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [hasDevices, setHasDevices] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Primero verificar si hay dispositivos vinculados
      const devices = await getDevices();
      if (devices.length === 0) {
        setHasDevices(false);
        setRows([]);
        setLoading(false);
        return;
      }
      
      setHasDevices(true);
      
      // Obtener datos de todos los dispositivos vinculados
      const data = await getSeries({ since_minutes: 6 * 60, limit: 2000 });
      setRows(data.reverse()); // asc
      setLastUpdate(new Date());
      
      if (data.length === 0) {
        setError("No hay datos disponibles. Asegúrate de que tus dispositivos estén enviando mediciones.");
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Error al cargar los datos. Por favor, intenta de nuevo.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Actualizar cada 5 segundos para tiempo real
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const kAire = useMemo(() => avg(rows.map((r) => r.temp_aire_c)), [rows]);
  const kPiel = useMemo(() => avg(rows.map((r) => r.temp_piel_c)), [rows]);
  const kHum = useMemo(() => avg(rows.map((r) => r.humedad)), [rows]);
  const kPeso = useMemo(() => avg(rows.map((r) => r.peso_g)), [rows]);

  const minAire = useMemo(() => min(rows.map((r) => r.temp_aire_c)), [rows]);
  const maxAire = useMemo(() => max(rows.map((r) => r.temp_aire_c)), [rows]);
  const minPiel = useMemo(() => min(rows.map((r) => r.temp_piel_c)), [rows]);
  const maxPiel = useMemo(() => max(rows.map((r) => r.temp_piel_c)), [rows]);
  const minHum = useMemo(() => min(rows.map((r) => r.humedad)), [rows]);
  const maxHum = useMemo(() => max(rows.map((r) => r.humedad)), [rows]);

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

  // Mostrar mensaje si no hay dispositivos vinculados
  if (!hasDevices) {
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
  if (error || rows.length === 0) {
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
          </div>
          <button
            onClick={fetchData}
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
            {error ? "Error al cargar datos" : "No hay datos disponibles"}
          </h2>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            {error || "Asegúrate de que tus dispositivos estén enviando mediciones."}
          </p>
          <button
            onClick={fetchData}
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
          </p>
        </div>
        <button
          onClick={fetchData}
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
            data={rows}
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
            data={rows}
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
            data={rows}
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
            Registro detallado de las últimas mediciones ({rows.length} registros)
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
              {rows.slice(-20).reverse().map((r, i) => (
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
