import { useEffect, useState, useMemo } from "react";
import { getAlerts, type AlertRow } from "../api/client";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useTheme } from "../contexts/ThemeContext";

// Mapeo de alertas según el firmware ESP32
const ALERT_INFO: Record<string, { label: string; description: string; color: string; icon: string }> = {
  ST: {
    label: "Sobretemperatura",
    description: "Habitáculo >40°C o neonato >37°C",
    color: "#ef4444",
    icon: "🔥",
  },
  FF: {
    label: "Falla de Flujo",
    description: "Velocidad de giro <250 rpm",
    color: "#f59e0b",
    icon: "💨",
  },
  FS: {
    label: "Falla de Sensor",
    description: "Algún sensor no está midiendo correctamente",
    color: "#8b5cf6",
    icon: "⚠️",
  },
  FP: {
    label: "Falla de Programa",
    description: "El programa se estancó en una tarea",
    color: "#dc2626",
    icon: "💥",
  },
  PI: {
    label: "Postura Incorrecta",
    description: "El neonato está en posición incorrecta",
    color: "#ec4899",
    icon: "🔄",
  },
};

// Función para decodificar máscara de alertas del backend (formato antiguo)
function decodeAlertsFromMask(mask: number): string[] {
  const alerts: string[] = [];
  if (mask & 1) alerts.push("ST");
  if (mask & 2) alerts.push("FF");
  if (mask & 4) alerts.push("FS");
  if (mask & 8) alerts.push("FP");
  if (mask & 16) alerts.push("PI");
  return alerts;
}

export default function AlertsPage() {
  const { colors } = useTheme();
  const { 
    currentAlarms: bleAlarms, 
    isConnected: bleConnected,
    deviceName: bleDeviceName,
    sendCommand 
  } = useBluetooth();
  
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
    // Actualizar alertas cada 1 segundo para tiempo real
    const interval = setInterval(fetchAlerts, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generar alertas activas desde Bluetooth en tiempo real
  const activeBleAlerts = useMemo(() => {
    const active: Array<{ type: string; info: typeof ALERT_INFO[string]; timestamp: Date }> = [];
    
    if (bleAlarms.ST) active.push({ type: "ST", info: ALERT_INFO.ST, timestamp: new Date() });
    if (bleAlarms.FF) active.push({ type: "FF", info: ALERT_INFO.FF, timestamp: new Date() });
    if (bleAlarms.FS) active.push({ type: "FS", info: ALERT_INFO.FS, timestamp: new Date() });
    if (bleAlarms.FP) active.push({ type: "FP", info: ALERT_INFO.FP, timestamp: new Date() });
    if (bleAlarms.PI) active.push({ type: "PI", info: ALERT_INFO.PI, timestamp: new Date() });
    
    return active;
  }, [bleAlarms]);

  // Combinar alertas del backend y Bluetooth
  const allAlerts = useMemo(() => {
    const combined: Array<{
      ts: string;
      device_id: string;
      type: string;
      info: typeof ALERT_INFO[string];
      source: "backend" | "ble";
    }> = [];
    
    // Agregar alertas del backend
    backendAlerts.forEach(alert => {
      const types = decodeAlertsFromMask(alert.mask);
      types.forEach(type => {
        if (ALERT_INFO[type]) {
          combined.push({
            ts: alert.ts,
            device_id: alert.device_id || "Unknown",
            type,
            info: ALERT_INFO[type],
            source: "backend",
          });
        }
      });
    });
    
    // Agregar alertas activas de Bluetooth
    activeBleAlerts.forEach(alert => {
      combined.push({
        ts: new Date().toISOString(),
        device_id: bleDeviceName || "BLE Device",
        type: alert.type,
        info: alert.info,
        source: "ble",
      });
    });
    
    // Ordenar por timestamp (más recientes primero)
    return combined.sort((a, b) => {
      const dateA = new Date(a.ts).getTime();
      const dateB = new Date(b.ts).getTime();
      return dateB - dateA;
    }).slice(0, 200); // Limitar a 200 alertas
  }, [backendAlerts, activeBleAlerts, bleDeviceName]);

  // Función para probar alarmas remotamente
  const testAlarm = async (type: string) => {
    if (!bleConnected) {
      alert("No hay conexión Bluetooth activa");
      return;
    }
    
    const commands: Record<string, string> = {
      ST: "PRST",
      FF: "PRFF",
      FS: "PRFS",
      FP: "PRFP",
      PI: "PRPI",
    };
    
    const command = commands[type];
    if (command) {
      try {
        await sendCommand(command);
        console.log(`[AlertsPage] Comando de prueba enviado: ${command}`);
      } catch (err) {
        console.error(`[AlertsPage] Error enviando comando:`, err);
        alert("Error al enviar comando de prueba");
      }
    }
  };

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
                🔵 BLE: {bleDeviceName}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {bleConnected && (
            <button
              onClick={() => {
                const hasActive = Object.values(bleAlarms).some(v => v);
                if (hasActive) {
                  alert("Hay alertas activas. Usa los botones de prueba individuales.");
                } else {
                  alert("No hay alertas activas en este momento.");
                }
              }}
              className="btn px-4 py-2 flex items-center gap-2 text-sm"
              style={{
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
              }}
            >
              <span>🔍</span>
              Estado
            </button>
          )}
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
      </div>

      {/* Alertas activas desde Bluetooth */}
      {bleConnected && activeBleAlerts.length > 0 && (
        <div className="card p-4" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b", borderWidth: "2px" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold" style={{ color: "#92400e" }}>
                Alertas Activas en Dispositivo Bluetooth
              </div>
              <div className="text-sm" style={{ color: "#78350f" }}>
                {bleDeviceName}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeBleAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="px-3 py-2 rounded-lg flex items-center gap-2"
                style={{
                  backgroundColor: `${alert.info.color}20`,
                  border: `1px solid ${alert.info.color}`,
                }}
              >
                <span className="text-lg">{alert.info.icon}</span>
                <div>
                  <div className="font-semibold text-sm" style={{ color: alert.info.color }}>
                    {alert.info.label}
                  </div>
                  <div className="text-xs" style={{ color: colors.textSecondary }}>
                    {alert.info.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de prueba de alarmas (solo si hay BLE conectado) */}
      {bleConnected && (
        <div className="card p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
            Prueba de Alarmas Remotas
          </h2>
          <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
            Envía comandos de prueba al dispositivo para activar temporalmente las alarmas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(ALERT_INFO).map(([type, info]) => (
              <button
                key={type}
                onClick={() => testAlarm(type)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: `${info.color}20`,
                  color: info.color,
                  border: `1px solid ${info.color}40`,
                }}
              >
                <div className="text-lg mb-1">{info.icon}</div>
                <div>{info.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de alertas históricas */}
      {allAlerts.length === 0 ? (
        <div className="card p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>
            No hay alertas registradas
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
              const isRecent = new Date(alert.ts).getTime() > Date.now() - 60000; // Último minuto
              const isActive = alert.source === "ble" && activeBleAlerts.some(a => a.type === alert.type);
              
              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border-l-4 transition-all"
                  style={{
                    backgroundColor: isActive || isRecent ? `${alert.info.color}15` : colors.card,
                    borderLeftColor: alert.info.color,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{alert.info.icon}</span>
                        <span className="text-lg font-semibold" style={{ color: colors.text }}>
                          {alert.info.label}
                        </span>
                        {isRecent && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white animate-pulse">
                            NUEVO
                          </span>
                        )}
                        {isActive && (
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: alert.info.color, color: "white" }}>
                            ACTIVA
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: colors.border, color: colors.textSecondary }}>
                          {alert.source === "ble" ? "🔵 BLE" : "💾 Backend"}
                        </span>
                      </div>
                      <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                        {alert.info.description}
                      </div>
                      <div className="text-xs" style={{ color: colors.textSecondary }}>
                        <div>Dispositivo: {alert.device_id}</div>
                        <div>Timestamp: {new Date(alert.ts).toLocaleString("es-ES")}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
