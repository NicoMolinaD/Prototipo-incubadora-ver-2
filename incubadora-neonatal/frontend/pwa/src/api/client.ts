// src/api/client.ts
import type { DeviceRow } from './types';

// Determine the base URL for API calls.
// The backend origin can be supplied via the VITE_API_BASE environment variable.
// If it is undefined or empty, fall back to location.origin + "/api/incubadora"
const BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  (typeof window !== 'undefined' && window.location
    ? window.location.origin + '/api/incubadora'
    : 'http://localhost:8000/api/incubadora');

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

// === Gestión de dispositivos ===
export async function getAvailableDevices() {
  const r = await fetch(`${BASE}/devices/available`, {
    headers: getAuthHeaders(),
  });
  return j<DeviceRow[]>(r);
}

export async function linkDevice(device_id: string) {
  const r = await fetch(`${BASE}/devices/${encodeURIComponent(device_id)}/link`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return j<{ id: number; device_id: string; user_id: number | null; name: string | null }>(r);
}

export async function unlinkDevice(device_id: string) {
  const r = await fetch(`${BASE}/devices/${encodeURIComponent(device_id)}/unlink`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return j<{ id: number; device_id: string; user_id: number | null; name: string | null }>(r);
}
