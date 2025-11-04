import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDevices, getLatest, type DeviceRow, type MeasurementOut } from "../api/client";

function fmt(x?: number | null, u = "") {
  return x === null || x === undefined ? "--" : `${x.toFixed(1)}${u}`;
}

// PRUEBA A: invertir RX/TX
const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
//const RX_UUID      = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write
//const TX_UUID      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify


/** Convierte una línea de texto BLE en campos que la UI ya usa. Ajusta claves según tu firmware. */
function parseBleLine(s: string): Partial<MeasurementOut> {
  // Ejemplo esperado: "Peso:123.4,Temp:36.8,Hum:55.2,Set:38"
  const m: Record<string, string> = {};
  s.split(",").forEach(pair => {
    const [k, v] = pair.split(":");
    if (k && v) m[k.trim().toLowerCase()] = v.trim();
  });

  const nowIso = new Date().toISOString();

  // Mapea nombres del firmware → MeasurementOut
  // Ajusta si tu firmware usa otros (p. ej. "temp_aire" / "temp_piel")
  const partial: Partial<MeasurementOut> = {
    ts: nowIso,
  };

  if (m["peso"]) partial.peso_g = Number(m["peso"]);
  if (m["hum"])  partial.humedad = Number(m["hum"]);
  // Si tu firmware manda una sola "Temp", decide a cuál mapear:
  if (m["temp"]) partial.temp_aire_c = Number(m["temp"]);
  if (m["temp_aire"]) partial.temp_aire_c = Number(m["temp_aire"]);
  if (m["temp_piel"]) partial.temp_piel_c = Number(m["temp_piel"]);

  return partial;
}

export default function LiveDataPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [latest, setLatest] = useState<MeasurementOut | null>(null);

  // BLE state/refs
  const [bleConnected, setBleConnected] = useState(false);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const txRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const rxRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const [lastBleMsg, setLastBleMsg] = useState<string>("");

  /* ------------------- cargar lista de dispositivos (poll 5s) ------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getDevices();
        if (!alive) return;
        setDevices(rows);
        if (!current && rows.length) setCurrent(rows[0].id);
      } catch (e) {
        console.error("getDevices failed", e);
      }
    })();
    const id = setInterval(() => {
      getDevices()
        .then((rows) => {
          setDevices(rows);
          if (!current && rows.length) setCurrent(rows[0].id);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [current]);

  /* ------------------- polling último valor backend (cada 5s) ------------------- */
  useEffect(() => {
    if (!current) return;
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

  /* ------------------- BLE: conectar / desconectar / enviar ------------------- */
  const onNotify = useCallback((ev: Event) => {
    const c = ev.target as BluetoothRemoteGATTCharacteristic;
    const dv = c?.value;
    if (!dv) return;
    const text = new TextDecoder().decode(dv.buffer);
    setLastBleMsg(text);
    const partial = parseBleLine(text);
    setLatest((prev) => ({ ...(prev ?? ({} as MeasurementOut)), ...partial }));
    // console.log("BLE ►", text, partial);
  }, []);

  const connectBLE = async () => {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID as BluetoothServiceUUID] }],
    optionalServices: [SERVICE_UUID as BluetoothServiceUUID],
    // Si falla, prueba:
    // acceptAllDevices: true, optionalServices: [SERVICE_UUID as BluetoothServiceUUID],
  });

  const server  = await device.gatt!.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const chars   = await service.getCharacteristics();

  // Ver en consola qué hay realmente
  for (const c of chars) {
    const p = c.properties;
    console.log("Char:", c.uuid, {
      read: p.read, write: p.write, writeNR: p.writeWithoutResponse,
      notify: p.notify, indicate: p.indicate
    });
  }

  // Elegir por PROPIEDADES
  const txChar = chars.find(c => c.properties.notify || c.properties.indicate); // ESP32 -> Web
  const rxChar = chars.find(c => c.properties.write  || c.properties.writeWithoutResponse); // Web -> ESP32

  if (!txChar || !rxChar) {
    throw new Error("No hay características con notify/indicate y write/writeNR en el servicio.");
  }

  // Notificaciones solo si están soportadas
  if (txChar.properties.notify || txChar.properties.indicate) {
    await txChar.startNotifications();
    txChar.addEventListener("characteristicvaluechanged", (ev: Event) => {
      const dv = (ev.target as BluetoothRemoteGATTCharacteristic).value!;
      const text = new TextDecoder().decode(dv.buffer);
      console.log("BLE ►", text);
      // aquí puedes parsear y actualizar estado si quieres
    });
  } else {
    throw new Error("La característica TX no soporta notificaciones/indicaciones.");
  }

  // Envío (usa writeNR si está disponible)
  const send = async (msg: string) => {
    const data = new TextEncoder().encode(msg);
    if (rxChar.properties.writeWithoutResponse) {
      await rxChar.writeValueWithoutResponse(data);
    } else if (rxChar.properties.write) {
      await rxChar.writeValue(data);
    } else {
      throw new Error("La característica RX no soporta escritura.");
    }
  };

  // Ejemplo:
  // await send("PING");
};


  const disconnectBLE = useCallback(() => {
    try {
      const d = deviceRef.current;
      if (d?.gatt?.connected) d.gatt.disconnect();
      setBleConnected(false);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const sendBLE = useCallback(async (msg: string) => {
    const rx = rxRef.current;
    if (!rx) return alert("No hay conexión BLE.");
    await rx.writeValue(new TextEncoder().encode(msg));
  }, []);

  /* ------------------- helpers de UI ------------------- */
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
              <button onClick={disconnectBLE} className="rounded border px-3 py-2">
                Desconectar BLE
              </button>
              <button onClick={() => sendBLE("LED_ON")} className="rounded border px-3 py-2">
                LED ON
              </button>
              <button onClick={() => sendBLE("LED_OFF")} className="rounded border px-3 py-2">
                LED OFF
              </button>
              <button onClick={() => sendBLE("SET:38")} className="rounded border px-3 py-2">
                SET 38
              </button>
            </>
          )}
        </div>

        {lastBleMsg && (
          <div className="mt-3">
            <div className="text-sm opacity-70">Último mensaje BLE</div>
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

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm mb-2">{title}</div>
      <div className="text-2xl font-semibold">{children}</div>
    </div>
  );
}
