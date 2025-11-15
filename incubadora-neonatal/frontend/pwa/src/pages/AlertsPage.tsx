import { useEffect, useState, useMemo } from "react";
import { getAlerts, type AlertRow } from "../api/client";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useTheme } from "../contexts/ThemeContext";

// Mapeo de máscaras de alerta a etiquetas descriptivas
const ALERT_LABELS: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: "Alta temperatura del aire", color: "#ef4444", icon: "🔥" },
  2: { label: "Baja temperatura del aire", color: "#3b82f6", icon: "❄️" },
  4: { label: "Alta humedad", color: "#10b981", icon: "💧" },
  8: { label: "Baja humedad", color: "#f59e0b", icon: "🌵" },
  16: { label: "Bajo peso", color: "#8b5cf6", icon: "⚖️" },
};

// Función para decodificar máscara de alertas
function decodeAlerts(mask: number): Array<{ label: string; color: string; icon: string }> {
  const alerts: Array<{ label: string; color: string; icon: string }> = [];
  for (const [bit, info] of Object.entries(ALERT_LABELS)) {
    if (mask & parseInt(bit)) {
      alerts.push(info);
    }
  }
  return alerts;
}

export default function AlertsPage() {
  const { colors } = useTheme();
  const { latestData: bleLatestData, dataHistory: bleDataHistory, isConnected: bleConnected } = useBluetooth();
  
  const [backendAlerts, setBackendAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Obtener alertas del backend
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const alerts = await getAlerts({ limit: 200, since_minutes: 24 * 60 });
      setBackendAlerts(alerts);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("[AlertsPage] Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Actualizar alertas cada 5 segundos
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Generar alertas desde datos de Bluetooth en tiempo real
  const bleAlerts = useMemo(() => {
    if (!bleLatestData || !bleLatestData.alerts) return [];
    
    const alerts = decodeAlerts(bleLatestData.alerts);
    if (alerts.length === 0) return [];
    
    return [{
      ts: bleLatestData.ts || new Date().toISOString(),
      device_id: "BLE Device",
      mask: bleLatestData.alerts,
      labels: alerts.map(a => a.label),
    }];
  }, [bleLatestData]);

  // Combinar alertas del backend y Bluetooth
  const allAlerts = useMemo(() => {
    const combined = [...backendAlerts];
    
    // Agregar alertas de Bluetooth si son nuevas
    if (bleAlerts.length > 0) {
      const latestBleAlert = bleAlerts[0];
      const exists = combined.some(a => 
        a.ts === latestBleAlert.ts && a.device_id === latestBleAlert.device_id
      );
      if (!exists) {
        combined.unshift(latestBleAlert);
      }
    }
    
    // Ordenar por timestamp (más recientes primero)
    return combined.sort((a, b) => {
      const dateA = new Date(a.ts).getTime();
      const dateB = new Date(b.ts).getTime();
      return dateB - dateA;
    }).slice(0, 200); // Limitar a 200 alertas
  }, [backendAlerts, bleAlerts]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Alertas
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            Sistema de alertas en tiempo real • Última actualización: {lastUpdate.toLocaleTimeString()}
            {bleConnected && (
              <span className="ml-2 px-2 py-1 rounded text-xs" style={{ backgroundColor: "#10b981", color: "white" }}>
                🔵 BLE Conectado
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchAlerts}
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

      {allAlerts.length === 0 ? (
        <div className="card p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
            No hay alertas activas
          </h2>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Todos los sistemas funcionando correctamente.
          </p>
        </div>
      ) : (
        <div className="card p-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
              {allAlerts.length} alerta(s) encontrada(s)
            </h2>
          </div>
          <div className="space-y-3">
            {allAlerts.map((alert, index) => {
              const decoded = decodeAlerts(alert.mask);
              const isRecent = new Date(alert.ts).getTime() > Date.now() - 60000; // Último minuto
              
              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border-l-4 transition-all"
                  style={{
                    backgroundColor: isRecent ? "rgba(239, 68, 68, 0.1)" : colors.card,
                    borderLeftColor: decoded[0]?.color || "#ef4444",
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                          {new Date(alert.ts).toLocaleString("es-ES")}
                        </span>
                        {isRecent && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white animate-pulse">
                            NUEVO
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                        Dispositivo: {alert.device_id}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {decoded.map((alertInfo, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                            style={{
                              backgroundColor: `${alertInfo.color}20`,
                              color: alertInfo.color,
                              border: `1px solid ${alertInfo.color}40`,
                            }}
                          >
                            <span>{alertInfo.icon}</span>
                            <span>{alertInfo.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                      Mask: {alert.mask}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Información sobre alertas activas desde Bluetooth */}
      {bleConnected && bleLatestData?.alerts && bleLatestData.alerts > 0 && (
        <div className="card p-4" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold" style={{ color: "#92400e" }}>
                Alerta activa en dispositivo Bluetooth
              </div>
              <div className="text-sm" style={{ color: "#78350f" }}>
                {decodeAlerts(bleLatestData.alerts).map(a => a.label).join(", ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
