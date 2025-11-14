import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDevices, getLatest } from "../api/client";
import type { DeviceRow, MeasurementOut } from "../api/types";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useTheme } from "../contexts/ThemeContext";

// Formatea números o muestra "--"
function fmt(x?: number | null, u = ""): string {
  return x === null || x === undefined ? "--" : `${x.toFixed(1)}${u}`;
}

export default function LiveDataPage() {
  const { colors } = useTheme();
  const {
    isConnected: bleConnected,
    deviceName,
    lastMessage: lastBleMsg,
    latestData: bleLatestData,
    sendCommand: sendBLE,
    spAir,
    spSkin,
    spHum,
    currentMode,
    lightMode,
    setSpAir,
    setSpSkin,
    setSpHum,
    setCurrentMode,
    setLightMode,
  } = useBluetooth();

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [latest, setLatest] = useState<MeasurementOut | null>(null);

  // Estado de mute de alarmas
  const [alarmsMuted, setAlarmsMuted] = useState<boolean>(false);
  const muteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<{ temp_aire_c?: number; temp_piel_c?: number; humedad?: number } | null>(null);

  // Poll de dispositivos (cada 5 s) - tiempo real
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const rows = await getDevices();
        if (!alive) return;
        setDevices(rows);
        setCurrent((cur) => cur || rows[0]?.id || "");
      } catch (e) {
        console.error("getDevices failed", e);
      }
    };

    load();
    const id = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Poll del último valor del backend (cada 5 s) - tiempo real
  useEffect(() => {
    if (!current) {
      setLatest(null);
      return;
    }

    let alive = true;

    const tick = async () => {
      try {
        const row = await getLatest(current);
        if (alive) setLatest(row ?? null);
      } catch (e) {
        console.error("getLatest failed", e);
      }
    };

    tick();
    const id = setInterval(tick, 5000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [current]);

  // Usar datos de BLE si están disponibles, sino usar datos del backend
  const displayData = useMemo(() => {
    return bleLatestData || latest;
  }, [bleLatestData, latest]);

  // Funciones de control de setpoints
  const adjustSpAir = useCallback(
    (delta: number) => {
      if (currentMode !== "AIR") return;
      const newVal = Math.max(25, Math.min(40, spAir + delta));
      setSpAir(newVal);
      sendBLE(`TSPA=${newVal.toFixed(1)}`).catch((err) => {
        console.error("Error sending BLE command:", err);
        alert("Error al enviar comando BLE");
      });
    },
    [spAir, sendBLE, currentMode, setSpAir]
  );

  const adjustSpSkin = useCallback(
    (delta: number) => {
      if (currentMode !== "SKIN") return;
      const newVal = Math.max(30, Math.min(37, spSkin + delta));
      setSpSkin(newVal);
      sendBLE(`TSPS=${newVal.toFixed(1)}`).catch((err) => {
        console.error("Error sending BLE command:", err);
        alert("Error al enviar comando BLE");
      });
    },
    [spSkin, sendBLE, currentMode, setSpSkin]
  );

  const adjustSpHum = useCallback(
    (delta: number) => {
      const newVal = Math.max(45, Math.min(85, spHum + delta));
      setSpHum(newVal);
      sendBLE(`HSP=${newVal.toFixed(1)}`).catch((err) => {
        console.error("Error sending BLE command:", err);
        alert("Error al enviar comando BLE");
      });
    },
    [spHum, sendBLE, setSpHum]
  );

  const setLightModeCmd = useCallback(
    (mode: string) => {
      setLightMode(mode);
      let lightCmd = "";
      if (mode === "CIRCADIAN") lightCmd = "CIRC";
      else if (mode === "ICTERICIA") lightCmd = "ICT";
      else if (mode === "PHOTOBIOMODULATION") lightCmd = "PBM";
      else lightCmd = mode;
      sendBLE(`LIGHT=${lightCmd}`).catch((err) => {
        console.error("Error sending BLE command:", err);
        alert("Error al enviar comando BLE");
      });
    },
    [sendBLE, setLightMode]
  );

  const setCurrentModeCmd = useCallback(
    (mode: string) => {
      setCurrentMode(mode);
      if (mode === "AIR") {
        sendBLE(`TSPA=${spAir.toFixed(1)}`).catch((err) => {
          console.error("Error sending BLE command:", err);
        });
      } else if (mode === "SKIN") {
        sendBLE(`TSPS=${spSkin.toFixed(1)}`).catch((err) => {
          console.error("Error sending BLE command:", err);
        });
      }
    },
    [sendBLE, spAir, spSkin, setCurrentMode]
  );

  // Función para mutear alarmas
  const muteAlarms = useCallback(() => {
    if (!bleConnected) {
      alert("No hay conexión BLE");
      return;
    }

    sendBLE("MUTE=ON")
      .then(() => {
        setAlarmsMuted(true);

        // Limpia timeout anterior si existe
        if (muteTimeoutRef.current) {
          clearTimeout(muteTimeoutRef.current);
        }

        // Desmutear automáticamente después de 10 segundos
        muteTimeoutRef.current = setTimeout(() => {
          sendBLE("MUTE=OFF")
            .then(() => {
              setAlarmsMuted(false);
              muteTimeoutRef.current = null;
            })
            .catch((err) => console.error("Error unmuting:", err));
        }, 10000);
      })
      .catch((err) => {
        console.error("Error muting:", err);
        alert("Error al silenciar alarmas");
      });
  }, [bleConnected, sendBLE]);

  // Monitorear cambios en los datos para detectar nuevas alarmas
  useEffect(() => {
    if (!displayData || !alarmsMuted) return;

    const current = {
      temp_aire_c: displayData.temp_aire_c,
      temp_piel_c: displayData.temp_piel_c,
      humedad: displayData.humedad,
    };

    const last = lastDataRef.current;

    // Si hay cambios significativos, puede ser una nueva alarma
    if (last) {
      const tempAirChanged =
        last.temp_aire_c !== undefined &&
        current.temp_aire_c !== undefined &&
        Math.abs(last.temp_aire_c - current.temp_aire_c) > 2.0;
      const tempSkinChanged =
        last.temp_piel_c !== undefined &&
        current.temp_piel_c !== undefined &&
        Math.abs(last.temp_piel_c - current.temp_piel_c) > 2.0;
      const humChanged =
        last.humedad !== undefined &&
        current.humedad !== undefined &&
        Math.abs(last.humedad - current.humedad) > 10.0;

      if (tempAirChanged || tempSkinChanged || humChanged) {
        // Desmutear para que suene la nueva alarma
        if (muteTimeoutRef.current) {
          clearTimeout(muteTimeoutRef.current);
          muteTimeoutRef.current = null;
        }
        sendBLE("MUTE=OFF")
          .then(() => {
            setAlarmsMuted(false);
          })
          .catch((err) => console.error("Error unmuting:", err));
      }
    }

    lastDataRef.current = current;
  }, [displayData, alarmsMuted, sendBLE]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (muteTimeoutRef.current) {
        clearTimeout(muteTimeoutRef.current);
      }
    };
  }, []);

  const lastSeen = useMemo(() => displayData?.ts ?? null, [displayData]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Información de conexión Bluetooth */}
      {bleConnected && (
        <div className="card p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600">●</span>
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Conectado: {deviceName || "Dispositivo Bluetooth"}
              </span>
            </div>
            {lastBleMsg && (
              <span className="text-xs" style={{ color: colors.textSecondary }}>
                Último mensaje recibido
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selector de dispositivo */}
      <div className="card p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="mb-2 text-sm font-medium" style={{ color: colors.text }}>
          Selecciona dispositivo
        </div>
        <select
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          }}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || d.id}
            </option>
          ))}
        </select>
        <div className="text-sm mt-2" style={{ color: colors.textSecondary }}>
          Última actualización: {lastSeen ? new Date(lastSeen).toLocaleString("es-ES") : "--"}
        </div>
        <div className="text-right text-xs mt-1" style={{ color: colors.textSecondary }}>
          Actualiza cada 5 s
        </div>

        {lastBleMsg && (
          <div className="mt-3 p-3 rounded border" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
            <div className="text-xs mb-1" style={{ color: colors.textSecondary }}>
              Último mensaje BLE
            </div>
            <pre className="text-xs whitespace-pre-wrap break-words" style={{ color: colors.text }}>
              {lastBleMsg}
            </pre>
          </div>
        )}
      </div>

      {/* Cards de métricas - Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="Timestamp" colors={colors}>
          {displayData?.ts ? new Date(displayData.ts).toLocaleString("es-ES") : "--"}
        </Card>
        <Card title="Temp aire (C)" colors={colors}>
          {fmt(displayData?.temp_aire_c)}
        </Card>
        <Card title="Temp piel (C)" colors={colors}>
          {fmt(displayData?.temp_piel_c)}
        </Card>
        <Card title="Humedad (%)" colors={colors}>
          {fmt(displayData?.humedad)}
        </Card>
        <Card title="Peso (g)" colors={colors}>
          {fmt(displayData?.peso_g)}
        </Card>
      </div>

      {/* Controles remotos - Solo visible si hay conexión BLE */}
      {bleConnected && (
        <div className="card p-6 space-y-6" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <h2 className="text-2xl font-semibold" style={{ color: colors.text }}>
            Controles Remotos
          </h2>

          {/* Sección: Modo de Control de Temperatura */}
          <div className="border-2 rounded-lg p-4" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
              Modo de Control de Temperatura
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setCurrentModeCmd("AIR")}
                className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                  currentMode === "AIR"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                Aire
              </button>
              <button
                onClick={() => setCurrentModeCmd("SKIN")}
                className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                  currentMode === "SKIN"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                Piel
              </button>
            </div>
          </div>

          {/* Sección: Setpoint Temperatura Aire - Solo visible cuando modo AIR */}
          {currentMode === "AIR" && (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Setpoint Temperatura Aire</h3>
                  <p className="text-sm text-slate-600">Rango: 25.0°C - 40.0°C</p>
                </div>
                <div className="text-3xl font-bold text-blue-700">{spAir.toFixed(1)}°C</div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => adjustSpAir(-0.1)}
                  className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spAir <= 25}
                >
                  -0.1°C
                </button>
                <button
                  onClick={() => adjustSpAir(-1.0)}
                  className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spAir <= 25}
                >
                  -1.0°C
                </button>
                <div className="flex-1 text-center text-sm text-slate-600 min-w-[80px]">Ajuste</div>
                <button
                  onClick={() => adjustSpAir(1.0)}
                  className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spAir >= 40}
                >
                  +1.0°C
                </button>
                <button
                  onClick={() => adjustSpAir(0.1)}
                  className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spAir >= 40}
                >
                  +0.1°C
                </button>
              </div>
            </div>
          )}

          {/* Sección: Setpoint Temperatura Piel - Solo visible cuando modo SKIN */}
          {currentMode === "SKIN" && (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Setpoint Temperatura Piel</h3>
                  <p className="text-sm text-slate-600">Rango: 30.0°C - 37.0°C</p>
                </div>
                <div className="text-3xl font-bold text-blue-700">{spSkin.toFixed(1)}°C</div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => adjustSpSkin(-0.1)}
                  className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spSkin <= 30}
                >
                  -0.1°C
                </button>
                <button
                  onClick={() => adjustSpSkin(-1.0)}
                  className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spSkin <= 30}
                >
                  -1.0°C
                </button>
                <div className="flex-1 text-center text-sm text-slate-600 min-w-[80px]">Ajuste</div>
                <button
                  onClick={() => adjustSpSkin(1.0)}
                  className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spSkin >= 37}
                >
                  +1.0°C
                </button>
                <button
                  onClick={() => adjustSpSkin(0.1)}
                  className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={spSkin >= 37}
                >
                  +0.1°C
                </button>
              </div>
            </div>
          )}

          {/* Sección: Setpoint Humedad Relativa */}
          <div className="border-2 rounded-lg p-4 bg-green-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Setpoint Humedad Relativa</h3>
                <p className="text-sm text-slate-600">Rango: 45.0% - 85.0%</p>
              </div>
              <div className="text-3xl font-bold text-green-700">{spHum.toFixed(1)}%</div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => adjustSpHum(-0.5)}
                className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={spHum <= 45}
              >
                -0.5%
              </button>
              <button
                onClick={() => adjustSpHum(-1.0)}
                className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={spHum <= 45}
              >
                -1.0%
              </button>
              <div className="flex-1 text-center text-sm text-slate-600 min-w-[80px]">Ajuste</div>
              <button
                onClick={() => adjustSpHum(1.0)}
                className="px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={spHum >= 85}
              >
                +1.0%
              </button>
              <button
                onClick={() => adjustSpHum(0.5)}
                className="px-4 sm:px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={spHum >= 85}
              >
                +0.5%
              </button>
            </div>
          </div>

          {/* Sección: Control de Iluminación Multimodal */}
          <div className="border-2 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Iluminación Multimodal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setLightModeCmd("CIRCADIAN")}
                className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                  lightMode === "CIRCADIAN"
                    ? "bg-yellow-500 text-white border-yellow-500 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-yellow-100"
                }`}
              >
                Luz Circadiana
              </button>
              <button
                onClick={() => setLightModeCmd("ICTERICIA")}
                className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                  lightMode === "ICTERICIA"
                    ? "bg-yellow-500 text-white border-yellow-500 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-yellow-100"
                }`}
              >
                Ictericia
              </button>
              <button
                onClick={() => setLightModeCmd("PHOTOBIOMODULATION")}
                className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                  lightMode === "PHOTOBIOMODULATION"
                    ? "bg-yellow-500 text-white border-yellow-500 shadow-md"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-yellow-100"
                }`}
              >
                Fotobiomodulación
              </button>
            </div>
          </div>

          {/* Sección: Control de Alarmas */}
          <div className="border-2 rounded-lg p-4 bg-red-50">
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Control de Alarmas</h3>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={muteAlarms}
                disabled={!bleConnected || alarmsMuted}
                className={`px-6 py-4 rounded-lg border-2 font-medium transition-all ${
                  alarmsMuted
                    ? "bg-slate-400 text-white border-slate-400 cursor-not-allowed"
                    : "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-md"
                }`}
              >
                {alarmsMuted ? "Alarmas Silenciadas" : "Silenciar Alarmas"}
              </button>
              {alarmsMuted && (
                <span className="text-sm text-slate-600">
                  Las alarmas están silenciadas. Se reactivarán automáticamente en 10 segundos o si se detecta una nueva alarma.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mensaje si no hay conexión BLE */}
      {!bleConnected && (
        <div className="card p-4 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Conecta un dispositivo Bluetooth desde la página de Dispositivos para controlar la incubadora remotamente.
          </p>
        </div>
      )}
    </div>
  );
}

// Tarjeta sencilla
function Card(props: { title: string; children: React.ReactNode; colors: any }) {
  const { title, children, colors } = props;
  return (
    <div className="card p-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>
        {title}
      </div>
      <div className="text-2xl font-semibold" style={{ color: colors.text }}>
        {children}
      </div>
    </div>
  );
}
