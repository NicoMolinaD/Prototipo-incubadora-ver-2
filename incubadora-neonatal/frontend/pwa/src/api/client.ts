export type DeviceSummary = {
  device_id: string;
  last_seen: string|null;
  status: "online"|"offline";
  metrics: {
    temp_piel_c?: number;
    temp_aire_c?: number;
    humedad?: number;
    luz?: number;
    peso_g?: number;
  };
};

export type Measurement = {
  id: number;
  device_id: string;
  ts: string;
  temp_piel_c?: number;
  temp_aire_c?: number;
  humedad?: number;
  luz?: number;
  ntc_c?: number;
  ntc_raw?: number;
  peso_g?: number;
};

export async function fetchDevices(): Promise<DeviceSummary[]> {
  const r = await fetch("/api/devices");
  return r.json();
}

export async function fetchLatest(limit = 50, device_id?: string): Promise<Measurement[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  if (device_id) p.set("device_id", device_id);
  const r = await fetch(`/api/incubadora/latest?${p}`);
  return r.json();
}
