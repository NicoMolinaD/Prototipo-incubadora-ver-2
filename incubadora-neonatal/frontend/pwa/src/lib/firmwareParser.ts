// Convierte texto del firmware (ESP32) a un objeto listo para /ingest.
// Tolera mayúsculas/minúsculas, espacios raros y coma decimal.
export type MeasurementIn = {
  device_id: string;
  ts?: string;
  temp_aire_c?: number;
  temp_piel_c?: number;
  humedad?: number;     // RH (%)
  peso_g?: number;      // gramos
  // agrega otros si los necesitas (set_control, ntc, etc.)
};

function toNum(s?: string): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
}

export function parseFirmwareText(text: string, deviceId: string): MeasurementIn {
  const payload: MeasurementIn = {
    device_id: deviceId,
    ts: new Date().toISOString(),
  };

  const t = text.replace(/\r/g, "").toLowerCase();

  // temp aire
  // ejemplos: "temp air: 26.3 c"  |  "air: 35.0 c"
  const mAir =
    t.match(/\btemp\s*air\s*[:=]\s*([-+]?[\d.,]+)\s*c/) ||
    t.match(/\bair\s*[:=]\s*([-+]?[\d.,]+)\s*c/);
  payload.temp_aire_c = toNum(mAir?.[1]);

  // temp piel / skin
  // ejemplos: "skin: 34.2 c"  |  "piel: 34.2 c"  |  "sp skin: 34.0 c" (si quieres tomar SP como medición, comenta esta línea)
  const mSkin =
    t.match(/\bskin\s*[:=]\s*([-+]?[\d.,]+)\s*c/) ||
    t.match(/\bpiel\s*[:=]\s*([-+]?[\d.,]+)\s*c/);
  payload.temp_piel_c = toNum(mSkin?.[1]);

  // humedad: "rh: 68.4 %"  |  "uhum: 0 %"
  // Si aparecen ambas, priorizamos RH.
  const mRH = t.match(/\brh\s*[:=]\s*([-+]?[\d.,]+)\s*%/);
  const mUHum = t.match(/\buhum\s*[:=]\s*([-+]?[\d.,]+)\s*%/);
  payload.humedad = toNum(mRH?.[1] ?? mUHum?.[1]);

  // peso: "weight: 3.100 kg" | "peso: 3100 g"
  // regla: si detecta "kg" multiplica por 1000; si detecta "g" deja igual;
  // si no hay unidad y el valor < 20 asumimos kg; si es >= 20 asumimos g.
  const mWeight =
    t.match(/\bweight\s*[:=]\s*([-+]?[\d.,]+)\s*(kg|g)\b/) ||
    t.match(/\bpeso\s*[:=]\s*([-+]?[\d.,]+)\s*(kg|g)\b/) ||
    t.match(/\bweight\s*[:=]\s*([-+]?[\d.,]+)/) ||
    t.match(/\bpeso\s*[:=]\s*([-+]?[\d.,]+)/);

  if (mWeight) {
    const val = toNum(mWeight[1]);
    const unit = mWeight[2]?.trim();
    if (typeof val === "number") {
      if (unit === "kg") payload.peso_g = Math.round(val * 1000);
      else if (unit === "g") payload.peso_g = Math.round(val);
      else payload.peso_g = val < 20 ? Math.round(val * 1000) : Math.round(val);
    }
  }

  // Si no se encontró nada numérico, devolvemos al menos device_id + ts
  return payload;
}
