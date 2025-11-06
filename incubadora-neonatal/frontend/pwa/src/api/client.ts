// src/api/client.ts
// Determine the base URL for API calls.  When building with Vite
// (both dev and production) the backend origin can be supplied via
// the VITE_API_BASE environment variable.  If undefined, fall back to
// a relative prefix so local development with a proxy still works.
// Determine the base URL for API calls.  The backend origin can be
// supplied via the VITE_API_BASE environment variable.  If it is
// undefined or empty, fall back to http://localhost:8000 which is
// where the API is exposed when using Docker Compose.
const API_ORIGIN =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_API_BASE &&
    (import.meta as any).env.VITE_API_BASE.trim()) ||
  "http://localhost:8000";
const BASE = `${API_ORIGIN.replace(/\/+$/, "")}/api/incubadora`;


// Helper to unwrap JSON responses and surface HTTP errors.
// Exported under a unique name to avoid minifier collisions in production builds.
const unwrapJson = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export async function ingest(p: any) {
  return unwrapJson(
    await fetch(`${BASE}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    }),
  );
}

export async function getDevices() {
  return unwrapJson(await fetch(`${BASE}/query/devices`));
}

export async function getLatest(id: string) {
  return unwrapJson(
    await fetch(`${BASE}/query/latest?device_id=${encodeURIComponent(id)}`),
  );
}

export async function getSeries(params: {
  device_id?: string;
  since_minutes?: number;
  limit?: number;
} = {}) {
  const sp = new URLSearchParams();
  if (params.device_id)     sp.set("device_id", params.device_id);
  if (params.since_minutes) sp.set("since_minutes", String(params.since_minutes));
  if (params.limit)         sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return unwrapJson(await fetch(`${BASE}/query/series${qs ? `?${qs}` : ""}`));
}

export async function getAlerts(params: {
  device_id?: string;
  since_minutes?: number;
  limit?: number;
} = {}) {
  const sp = new URLSearchParams();
  if (params.device_id)     sp.set("device_id", params.device_id);
  if (params.since_minutes) sp.set("since_minutes", String(params.since_minutes));
  if (params.limit)         sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return unwrapJson(await fetch(`${BASE}/alerts${qs ? `?${qs}` : ""}`));
}

export async function getModelStatus() {
  return unwrapJson(await fetch(`${BASE}/models/status`));
}

export async function retrainModel() {
  return unwrapJson(await fetch(`${BASE}/models/retrain`, { method: "POST" }));
}
