import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getDevices, getLatest, ingest } from "../api/client";
import type { DeviceRow, MeasurementOut } from "../api/types";
import { parseFirmwareText } from "../lib/firmwareParser";

// Formatea numeros o muestra "--"
function fmt(x?: number | null, u = ""): string {
  return x === null || x === undefined ? "--" : `${x.toFixed(1)}${u}`;
}

// Alias minimo para UUID de servicios BLE (evitamos depender de tipos DOM que faltan)
type BtServiceUUID = number | string;
const SERVICE_UUID: BtServiceUUID =
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

interface ParsedBleData extends Partial<MeasurementOut> {
  sp_air_c?: number;
  sp_skin_c?: number;
  sp_hum_pct?: number;
  current_mode?: string;
  adjust_target?: string;
}

function parseBleLine(text: string): ParsedBleData {
  const out: ParsedBleData = {
    ts: new Date().toISOString(),
  };

  const t = text.replace(/\r/g, "");

  // TEMP Air: 26.3 C
  const mTempAir = t.match(/TEMP\s*Air\s*:\s*([\d.]+)/i);
  if (mTempAir) {
    const v = parseFloat(mTempAir[1]);
    if (!Number.isNaN(v)) out.temp_aire_c = v;
  }

  // Skin: 34.0 C
  const mSkin = t.match(/\bSkin\s*:\s*([\d.]+)/i);
  if (mSkin) {
    const v = parseFloat(mSkin[1]);
    if (!Number.isNaN(v)) out.temp_piel_c = v;
  }

  // RH: 68.4 %
  const mRh = t.match(/\bRH\s*:\s*([\d.]+)/i);
  if (mRh) {
    const v = parseFloat(mRh[1]);
    if (!Number.isNaN(v)) out.humedad = v;
  }

  // uHum: 0 %
  const mUhum = t.match(/\buHum\s*:\s*([\d.]+)/i);
  if (mUhum && out.humedad === undefined) {
    const v = parseFloat(mUhum[1]);
    if (!Number.isNaN(v)) out.humedad = v;
  }

  // Weight: 3.10 kg
  const mWeight = t.match(/\bWeight\s*:\s*([\d.]+)/i);
  if (mWeight) {
    const v = parseFloat(mWeight[1]);
    if (!Number.isNaN(v)) {
      out.peso_g = v * 1000;
    }
  }

  // SP Air: 35.0 C
  const mSpAir = t.match(/\bSP\s*Air\s*:\s*([\d.]+)/i);
  if (mSpAir) {
    const v = parseFloat(mSpAir[1]);
    if (!Number.isNaN(v)) out.sp_air_c = v;
  }

  // SP Skin: 34.0 C
  const mSpSkin = t.match(/\bSP\s*Skin\s*:\s*([\d.]+)/i);
  if (mSpSkin) {
    const v = parseFloat(mSpSkin[1]);
    if (!Number.isNaN(v)) out.sp_skin_c = v;
  }

  // SP Hum: 55.0 %
  const mSpHum = t.match(/\bSP\s*Hum\s*:\s*([\d.]+)/i);
  if (mSpHum) {
    const v = parseFloat(mSpHum[1]);
    if (!Number.isNaN(v)) out.sp_hum_pct = v;
  }

  // Mode: AIR | SKIN
  const mMode = t.match(/\bMode\s*:\s*(\w+)/i);
  if (mMode) {
    out.current_mode = mMode[1].toUpperCase();
  }

  // Target: TEMP | HUM
  const mTarget = t.match(/\bTarget\s*:\s*(\w+)/i);
  if (mTarget) {
    out.adjust_target = mTarget[1].toUpperCase();
  }

  return out;
}


export default function LiveDataPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [latest, setLatest] = useState<MeasurementOut | null>(null);

  // Estado y refs BLE
  const [bleConnected, setBleConnected] = useState(false);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const txRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const rxRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const [lastBleMsg, setLastBleMsg] = useState("");

  // Estado de setpoints y controles
  const [spAir, setSpAir] = useState<number>(35.0);
  const [spSkin, setSpSkin] = useState<number>(34.0);
  const [spHum, setSpHum] = useState<number>(55.0);
  const [lightMode, setLightMode] = useState<string>("CIRCADIAN");
  const [currentMode, setCurrentMode] = useState<string>("AIR");

  // Poll de dispositivos (cada 5 s)
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

  // Poll del ultimo valor del backend (cada 5 s)
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

  const onNotify = useCallback((ev: Event) => {
      const c = ev.target as BluetoothRemoteGATTCharacteristic | null;
      const dv = c?.value;
      if (!dv) return;

      // 1) Texto crudo desde el ESP32
      const text = new TextDecoder().decode(dv.buffer);
      setLastBleMsg(text);

      // 2) Lo convertimos a un objeto parcial con nuestros campos
      const partial = parseBleLine(text);

      // Actualizar setpoints desde el mensaje BLE
      if (partial.sp_air_c !== undefined) setSpAir(partial.sp_air_c);
      if (partial.sp_skin_c !== undefined) setSpSkin(partial.sp_skin_c);
      if (partial.sp_hum_pct !== undefined) setSpHum(partial.sp_hum_pct);
      if (partial.current_mode) setCurrentMode(partial.current_mode);

      // Si no pudimos extraer nada util, no molestamos al backend
      const hasData = Object.keys(partial).length > 1 || partial.temp_aire_c !== undefined;
      if (!hasData) return;

      // 3) Actualizar la UI con lo que tengamos nuevo
      setLatest((prev) => ({ ...(prev ?? {}), ...partial } as MeasurementOut));

      // 4) Construir JSON para el backend
      const deviceId = deviceRef.current?.id ?? "esp32_demo";
      const payload = {
        device_id: deviceId,
        ...partial,
      };

      // 5) Enviar al endpoint /ingest como JSON (esto ya lo hace ingest())
      ingest(payload as any).catch((err) => {
        console.error("ingest failed", err);
      });
    }, []);

  // Conectar BLE
  const connectBLE = useCallback(async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID as any] }],
        optionalServices: [SERVICE_UUID as any],
      } as any);

      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(SERVICE_UUID as any);

      const chars: BluetoothRemoteGATTCharacteristic[] =
        await (service as any).getCharacteristics();

      const txChar =
        chars.find(
          (c: any) => c.properties.notify || c.properties.indicate
        ) || null;
      const rxChar =
        chars.find(
          (c: any) =>
            c.properties.write || c.properties.writeWithoutResponse
        ) || null;

      if (!txChar || !rxChar) {
        throw new Error(
          "No hay caracteristicas notify/indicate y write/writeNR en el servicio"
        );
      }

      await txChar.startNotifications();
      txChar.addEventListener(
        "characteristicvaluechanged",
        onNotify
      );

      deviceRef.current = device;
      txRef.current = txChar;
      rxRef.current = rxChar;
      setBleConnected(true);
    } catch (e) {
      console.error(e);
      alert("No se pudo conectar por Bluetooth");
    }
  }, [onNotify]);

  // Desconectar BLE
  const disconnectBLE = useCallback(() => {
    try {
      const d: any = deviceRef.current;
      if (d?.gatt?.connected) {
        d.gatt.disconnect();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBleConnected(false);
    }
  }, []);

  // Enviar comando BLE
  const sendBLE = useCallback(async (msg: string) => {
    const rx = rxRef.current;
    if (!rx) {
      alert("No hay conexion BLE");
      return;
    }
    await rx.writeValue(new TextEncoder().encode(msg));
  }, []);

  // Funciones de control de setpoints
  const adjustSpAir = useCallback((delta: number) => {
    const newVal = Math.max(25, Math.min(40, spAir + delta));
    setSpAir(newVal);
    sendBLE(`SPAIR:${newVal.toFixed(1)}`);
  }, [spAir, sendBLE]);

  const adjustSpSkin = useCallback((delta: number) => {
    const newVal = Math.max(30, Math.min(37, spSkin + delta));
    setSpSkin(newVal);
    sendBLE(`SPSKIN:${newVal.toFixed(1)}`);
  }, [spSkin, sendBLE]);

  const adjustSpHum = useCallback((delta: number) => {
    const newVal = Math.max(45, Math.min(85, spHum + delta));
    setSpHum(newVal);
    sendBLE(`SPHUM:${newVal.toFixed(1)}`);
  }, [spHum, sendBLE]);

  const setLightModeCmd = useCallback((mode: string) => {
    setLightMode(mode);
    sendBLE(`LIGHT:${mode}`);
  }, [sendBLE]);

  const setCurrentModeCmd = useCallback((mode: string) => {
    setCurrentMode(mode);
    sendBLE(`MODE:${mode}`);
  }, [sendBLE]);

  const lastSeen = useMemo(() => latest?.ts ?? null, [latest]);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border p-4">
        <div className="mb-2">Selecciona dispositivo</div>
        <select
          className="border rounded p-2"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id}
            </option>
          ))}
        </select>
        <div className="text-sm mt-2">Last seen: {lastSeen ?? "--"}</div>
        <div className="text-right text-xs">Actualiza cada 5 s</div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!bleConnected ? (
            <button onClick={connectBLE} className="rounded border px-3 py-2">
              Conectar por Bluetooth
            </button>
          ) : (
            <>
              <button
                onClick={disconnectBLE}
                className="rounded border px-3 py-2"
              >
                Desconectar BLE
              </button>
            </>
          )}
        </div>

        {lastBleMsg && (
          <div className="mt-3">
            <div className="text-sm opacity-70">Ultimo mensaje BLE</div>
            <pre className="rounded border p-3 whitespace-pre-wrap break-words">
              {lastBleMsg}
            </pre>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card title="TS">{latest?.ts ?? "--"}</Card>
        <Card title="Temp aire (C)">{fmt(latest?.temp_aire_c)}</Card>
        <Card title="Temp piel (C)">{fmt(latest?.temp_piel_c)}</Card>
        <Card title="Humedad (%)">{fmt(latest?.humedad)}</Card>
        <Card title="Peso (g)">{fmt(latest?.peso_g)}</Card>
      </div>

      {bleConnected && (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-xl font-semibold">Controles Remotos</h2>

          {/* Modo de Control */}
          <div className="border rounded p-3">
            <div className="mb-2 font-medium">Modo de Control</div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentModeCmd("AIR")}
                className={`px-3 py-1 rounded border ${
                  currentMode === "AIR" ? "bg-blue-200" : ""
                }`}
              >
                Aire
              </button>
              <button
                onClick={() => setCurrentModeCmd("SKIN")}
                className={`px-3 py-1 rounded border ${
                  currentMode === "SKIN" ? "bg-blue-200" : ""
                }`}
              >
                Piel
              </button>
            </div>
          </div>

          {/* Setpoint Temperatura Aire - Solo visible cuando modo AIR */}
          {currentMode === "AIR" && (
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Setpoint Temp Aire (25-40°C)</span>
                <span className="text-lg">{spAir.toFixed(1)}°C</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => adjustSpAir(-0.1)}
                  className="px-3 py-1 rounded border"
                  disabled={spAir <= 25}
                >
                  -0.1
                </button>
                <button
                  onClick={() => adjustSpAir(0.1)}
                  className="px-3 py-1 rounded border"
                  disabled={spAir >= 40}
                >
                  +0.1
                </button>
              </div>
            </div>
          )}

          {/* Setpoint Temperatura Piel - Solo visible cuando modo SKIN */}
          {currentMode === "SKIN" && (
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Setpoint Temp Piel (30-37°C)</span>
                <span className="text-lg">{spSkin.toFixed(1)}°C</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => adjustSpSkin(-0.1)}
                  className="px-3 py-1 rounded border"
                  disabled={spSkin <= 30}
                >
                  -0.1
                </button>
                <button
                  onClick={() => adjustSpSkin(0.1)}
                  className="px-3 py-1 rounded border"
                  disabled={spSkin >= 37}
                >
                  +0.1
                </button>
              </div>
            </div>
          )}

          {/* Setpoint Humedad */}
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Setpoint Humedad (45-85%)</span>
              <span className="text-lg">{spHum.toFixed(1)}%</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => adjustSpHum(-0.5)}
                className="px-3 py-1 rounded border"
                disabled={spHum <= 45}
              >
                -0.5
              </button>
              <button
                onClick={() => adjustSpHum(0.5)}
                className="px-3 py-1 rounded border"
                disabled={spHum >= 85}
              >
                +0.5
              </button>
            </div>
          </div>

          {/* Control de Iluminacion */}
          <div className="border rounded p-3">
            <div className="mb-2 font-medium">Modo de Iluminacion</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setLightModeCmd("CIRCADIAN")}
                className={`px-3 py-1 rounded border ${
                  lightMode === "CIRCADIAN" ? "bg-yellow-200" : ""
                }`}
              >
                Luz Circadiana
              </button>
              <button
                onClick={() => setLightModeCmd("ICTERICIA")}
                className={`px-3 py-1 rounded border ${
                  lightMode === "ICTERICIA" ? "bg-yellow-200" : ""
                }`}
              >
                Ictericia
              </button>
              <button
                onClick={() => setLightModeCmd("PHOTOBIOMODULATION")}
                className={`px-3 py-1 rounded border ${
                  lightMode === "PHOTOBIOMODULATION" ? "bg-yellow-200" : ""
                }`}
              >
                Fotobiomodulacion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tarjeta sencilla
function Card(props: { title: string; children: React.ReactNode }) {
  const { title, children } = props;
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm mb-2">{title}</div>
      <div className="text-2xl font-semibold">{children}</div>
    </div>
  );
}
