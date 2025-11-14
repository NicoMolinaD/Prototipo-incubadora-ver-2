import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { ingest } from "../api/client";
import type { MeasurementOut } from "../api/types";

// Alias mínimo para UUID de servicios BLE
type BtServiceUUID = number | string;
const SERVICE_UUID: BtServiceUUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

interface ParsedBleData extends Partial<MeasurementOut> {
  sp_air_c?: number;
  sp_skin_c?: number;
  sp_hum_pct?: number;
  current_mode?: string;
  adjust_target?: string;
  light_mode?: string;
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
  const mWeight = t.match(/\bWeight\s*:\s*([\d.]+)\s*kg/i);
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

  // Light: CIRC | ICT | PBM
  const mLight = t.match(/\bLight\s*:\s*(\w+)/i);
  if (mLight) {
    out.light_mode = mLight[1].toUpperCase();
  }

  return out;
}

interface BluetoothContextType {
  isConnected: boolean;
  deviceName: string | null;
  lastMessage: string;
  latestData: MeasurementOut | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (msg: string) => Promise<void>;
  // Estado de setpoints (para sincronización)
  spAir: number;
  spSkin: number;
  spHum: number;
  currentMode: string;
  lightMode: string;
  setSpAir: (val: number) => void;
  setSpSkin: (val: number) => void;
  setSpHum: (val: number) => void;
  setCurrentMode: (mode: string) => void;
  setLightMode: (mode: string) => void;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState("");
  const [latestData, setLatestData] = useState<MeasurementOut | null>(null);
  
  // Estado de setpoints
  const [spAir, setSpAir] = useState<number>(35.0);
  const [spSkin, setSpSkin] = useState<number>(34.0);
  const [spHum, setSpHum] = useState<number>(55.0);
  const [currentMode, setCurrentMode] = useState<string>("AIR");
  const [lightMode, setLightMode] = useState<string>("CIRCADIAN");

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const txRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const rxRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const onNotify = useCallback((ev: Event) => {
    const c = ev.target as BluetoothRemoteGATTCharacteristic | null;
    const dv = c?.value;
    if (!dv) return;

    // 1) Texto crudo desde el ESP32
    const text = new TextDecoder().decode(dv.buffer);
    setLastMessage(text);

    // 2) Convertir a objeto parcial
    const partial = parseBleLine(text);

    // Actualizar setpoints desde el mensaje BLE
    if (partial.sp_air_c !== undefined) setSpAir(partial.sp_air_c);
    if (partial.sp_skin_c !== undefined) setSpSkin(partial.sp_skin_c);
    if (partial.sp_hum_pct !== undefined) setSpHum(partial.sp_hum_pct);
    if (partial.current_mode) setCurrentMode(partial.current_mode);
    if (partial.light_mode) {
      const lightMap: Record<string, string> = {
        CIRC: "CIRCADIAN",
        ICT: "ICTERICIA",
        PBM: "PHOTOBIOMODULATION",
      };
      const mapped = lightMap[partial.light_mode] || partial.light_mode;
      setLightMode(mapped);
    }

    // Si no hay datos útiles, no enviar al backend
    const hasData = Object.keys(partial).length > 1 || partial.temp_aire_c !== undefined;
    if (!hasData) return;

    // 3) Actualizar UI con datos nuevos
    setLatestData((prev) => ({ ...(prev ?? {}), ...partial } as MeasurementOut));

    // 4) Enviar al backend
    const deviceId = deviceRef.current?.id ?? "esp32_demo";
    const payload = {
      device_id: deviceId,
      ...partial,
    };

    ingest(payload as any).catch((err) => {
      console.error("ingest failed", err);
    });
  }, []);

  const connect = useCallback(async () => {
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
          "No hay características notify/indicate y write/writeNR en el servicio"
        );
      }

      await txChar.startNotifications();
      txChar.addEventListener("characteristicvaluechanged", onNotify);

      deviceRef.current = device;
      txRef.current = txChar;
      rxRef.current = rxChar;
      setDeviceName(device.name || device.id);
      setIsConnected(true);

      // Manejar desconexión automática
      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setDeviceName(null);
        deviceRef.current = null;
        txRef.current = null;
        rxRef.current = null;
      });
    } catch (e: any) {
      console.error("Bluetooth connection error:", e);
      if (e.name !== "NotFoundError") {
        alert("No se pudo conectar por Bluetooth: " + (e.message || "Error desconocido"));
      }
    }
  }, [onNotify]);

  const disconnect = useCallback(() => {
    try {
      const d: any = deviceRef.current;
      if (d?.gatt?.connected) {
        d.gatt.disconnect();
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    } finally {
      setIsConnected(false);
      setDeviceName(null);
      deviceRef.current = null;
      txRef.current = null;
      rxRef.current = null;
    }
  }, []);

  const sendCommand = useCallback(async (msg: string) => {
    const rx = rxRef.current;
    if (!rx) {
      throw new Error("No hay conexión BLE");
    }
    await rx.writeValue(new TextEncoder().encode(msg));
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        disconnect();
      }
    };
  }, [disconnect]);

  return (
    <BluetoothContext.Provider
      value={{
        isConnected,
        deviceName,
        lastMessage,
        latestData,
        connect,
        disconnect,
        sendCommand,
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
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }
  return context;
}

