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
// frontend/pwa/src/api/client.ts
const BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  (location.origin + "/api/incubadora");

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    if (r.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(await r.text());
  }
  return r.json();
}

// Ingesta de medici�n (JSON que armamos en onNotify)
export async function ingest(payload: {
  device_id: string;
  ts?: string;
  temp_aire_c?: number;
  temp_piel_c?: number;
  humedad?: number;
  peso_g?: number;
}) {
  const r = await fetch(`${BASE}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return j<{ ok: true; id: number }>(r);
}

// Lista de dispositivos para poblar el selector
export async function getDevices() {
  const r = await fetch(`${BASE}/query/devices`, {
    headers: getAuthHeaders(),
  });
  return j<{ id: string; last_seen: string | null }[]>(r);
}

// �ltima muestra por device_id (para las cards de Live Data)
export async function getLatest(device_id: string) {
  const r = await fetch(
    `${BASE}/query/latest?device_id=${encodeURIComponent(device_id)}`,
    { headers: getAuthHeaders() }
  );
  return j<{
    ts: string;
    temp_aire_c?: number | null;
    temp_piel_c?: number | null;
    humedad?: number | null;
    peso_g?: number | null;
  } | null>(r);
}



// Helper to unwrap JSON responses and surface HTTP errors.
// Exported under a unique name to avoid minifier collisions in production builds.
const unwrapJson = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

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
  return unwrapJson(await fetch(`${BASE}/query/series${qs ? `?${qs}` : ""}`, {
    headers: getAuthHeaders(),
  }));
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
  return unwrapJson(await fetch(`${BASE}/alerts${qs ? `?${qs}` : ""}`, {
    headers: getAuthHeaders(),
  }));
}

export async function getModelStatus() {
  return unwrapJson(await fetch(`${BASE}/models/status`, {
    headers: getAuthHeaders(),
  }));
}

export async function retrainModel() {
  return unwrapJson(await fetch(`${BASE}/models/retrain`, {
    method: "POST",
    headers: getAuthHeaders(),
  }));
}
