// Convierte texto del firmware (ESP32) a un objeto listo para /ingest.
// Tolera mayusculas/minusculas, espacios raros y coma decimal.
export type MeasurementIn = {
  device_id: string;
  ts?: string;
  temp_aire_c?: number;
  temp_piel_c?: number;
  humedad?: number;
  peso_g?: number;
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
  const mAir =
    t.match(/\btemp\s*air\s*[:=]\s*([-+]?[\d.,]+)\s*c/) ||
    t.match(/\bair\s*[:=]\s*([-+]?[\d.,]+)\s*c/);
  payload.temp_aire_c = toNum(mAir?.[1]);

  // temp piel / skin
  const mSkin =
    t.match(/\bskin\s*[:=]\s*([-+]?[\d.,]+)\s*c/) ||
    t.match(/\bpiel\s*[:=]\s*([-+]?[\d.,]+)\s*c/);
  payload.temp_piel_c = toNum(mSkin?.[1]);

  // humedad: "rh: 68.4 %"  |  "uhum: 0 %"
  const mRH = t.match(/\brh\s*[:=]\s*([-+]?[\d.,]+)\s*%/);
  const mUHum = t.match(/\buhum\s*[:=]\s*([-+]?[\d.,]+)\s*%/);
  payload.humedad = toNum(mRH?.[1] ?? mUHum?.[1]);

  // peso: "weight: 3.100 kg" | "peso: 3100 g"
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

  // SP Air: setpoint temperatura aire
  const mSpAir = t.match(/\bsp\s*air\s*[:=]\s*([-+]?[\d.,]+)/);
  if (mSpAir) {
    (payload as any).sp_air_c = toNum(mSpAir[1]);
  }

  // SP Skin: setpoint temperatura piel
  const mSpSkin = t.match(/\bsp\s*skin\s*[:=]\s*([-+]?[\d.,]+)/);
  if (mSpSkin) {
    (payload as any).sp_skin_c = toNum(mSpSkin[1]);
  }

  // SP Hum: setpoint humedad
  const mSpHum = t.match(/\bsp\s*hum\s*[:=]\s*([-+]?[\d.,]+)/);
  if (mSpHum) {
    (payload as any).sp_hum_pct = toNum(mSpHum[1]);
  }

  return payload;
}
