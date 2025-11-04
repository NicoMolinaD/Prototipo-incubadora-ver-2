// src/api/client.ts (añade si faltan)
const BASE = "/api/incubadora";
const j = async (r: Response) => { if (!r.ok) throw new Error(await r.text()); return r.json(); };

// ya existentes:
export async function ingest(p: any) {
  return j(await fetch(`${BASE}/ingest`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(p) }));
}
export async function getDevices()        { return j(await fetch(`${BASE}/query/devices`)); }
export async function getLatest(id: string) { return j(await fetch(`${BASE}/query/latest?device_id=${encodeURIComponent(id)}`)); }

// NUEVOS (para que el build no truene; pueden hablar con backend real o devolver vacío)
export async function getSeries(params: {device_id?: string; since_minutes?: number; limit?: number}) {
  const sp = new URLSearchParams();
  if (params.device_id)     sp.set("device_id", params.device_id);
  if (params.since_minutes) sp.set("since_minutes", String(params.since_minutes));
  if (params.limit)         sp.set("limit", String(params.limit));
  return j(await fetch(`${BASE}/query/series?${sp.toString()}`));
}
export async function getAlerts(): Promise<any[]> { return []; }
export async function getModelStatus(): Promise<any> {
  return { name: "demo", version: "v0.0.0", trained: false, last_trained: null, notes: null };
}
export async function retrainModel(): Promise<{ok:true}> { return { ok: true }; }
