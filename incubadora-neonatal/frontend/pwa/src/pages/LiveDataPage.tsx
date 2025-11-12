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

/**
 * Convierte una linea recibida por BLE en campos de telemetria.
 * Busca "Temp Air", "Air", "Skin", "RH", "uHum" y "Weight".
 */
function parseBleLine(text: string): Partial<MeasurementOut> {
  const out: Partial<MeasurementOut> = {
    ts: new Date().toISOString(),
  };

  // TEMP Air: 26.3 C  |  Air: 26.3 C
  const mTempAir =
    text.match(/TEMP\s*Air\s*:\s*([\d.]+)/i) ||
    text.match(/\bAir\s*:\s*([\d.]+)/i);
  if (mTempAir) {
    const v = parseFloat(mTempAir[1]);
    if (!Number.isNaN(v)) out.temp_aire_c = v;
  }

  // Skin: 34.0 C
  const mSkin = text.match(/\bSkin\s*:\s*([\d.]+)/i);
  if (mSkin) {
    const v = parseFloat(mSkin[1]);
    if (!Number.isNaN(v)) out.temp_piel_c = v;
  }

  // RH: 68.4 %   o   Hum: 55.0 %
  const mRh =
    text.match(/\bRH\s*:\s*([\d.]+)/i) ||
    text.match(/\bHum(?:idity)?\s*:\s*([\d.]+)/i);
  if (mRh) {
    const v = parseFloat(mRh[1]);
    if (!Number.isNaN(v)) out.humedad = v;
  }

  // uHum: 0 %  (si quieres tratarlo igual que humedad)
  const mUhum = text.match(/\buHum\s*:\s*([\d.]+)/i);
  if (mUhum && out.humedad === undefined) {
    const v = parseFloat(mUhum[1]);
    if (!Number.isNaN(v)) out.humedad = v;
  }

  // Weight / Peso opcional (solo si en algún momento lo envías)
  const mWeight = text.match(/\bWeight\s*:\s*([\d.]+)/i);
  if (mWeight) {
    const v = parseFloat(mWeight[1]);
    if (!Number.isNaN(v)) {
      // si el ESP manda en kg:
      out.peso_g = v * 1000;
      // si manda en g directo, usa: out.peso_g = v;
    }
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

      // Si no pudimos extraer nada útil, no molestamos al backend
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
              <button
                onClick={() => sendBLE("LED_ON")}
                className="rounded border px-3 py-2"
              >
                LED ON
              </button>
              <button
                onClick={() => sendBLE("LED_OFF")}
                className="rounded border px-3 py-2"
              >
                LED OFF
              </button>
              <button
                onClick={() => sendBLE("SET:38")}
                className="rounded border px-3 py-2"
              >
                SET 38
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
        <Card title="Aire (C)">{fmt(latest?.temp_aire_c)}</Card>
        <Card title="Piel (C)">{fmt(latest?.temp_piel_c)}</Card>
        <Card title="H (%)">{fmt(latest?.humedad)}</Card>
        <Card title="Peso (g)">{fmt(latest?.peso_g)}</Card>
      </div>
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
