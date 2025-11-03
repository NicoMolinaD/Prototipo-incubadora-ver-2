// frontend/pwa/src/api/client.ts
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  `${location.protocol}//${location.hostname}:8000`;

export type DeviceMetrics = {
  temp_piel_c?: number | null;
  temp_aire_c?: number | null;
  humedad?: number | null;
  luz?: number | null;
  peso_g?: number | null;
};

export type DeviceRow = {
  device_id: string;
  last_seen: string | null;
  status: "online" | "offline";
  metrics: DeviceMetrics;
};

export async function getDevices(): Promise<DeviceRow[]> {
  const r = await fetch(`${API_BASE}/api/devices`);
  if (!r.ok) throw new Error(`devices ${r.status}`);
  return r.json();
}

export async function getLatest(limit = 30, device_id?: string) {
  const url = new URL(`${API_BASE}/api/incubadora/latest`);
  url.searchParams.set("limit", String(limit));
  if (device_id) url.searchParams.set("device_id", device_id);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`latest ${r.status}`);
  return r.json();
}

export async function postIngest(body: any) {
  const r = await fetch(`${API_BASE}/api/incubadora/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ingest ${r.status}`);
  return r.json();
}
