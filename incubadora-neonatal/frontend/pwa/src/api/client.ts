// src/api/client.ts
import type { DeviceRow, SeriesPoint } from './types';

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

// Función unificada para manejar respuestas JSON y errores de autenticación
async function handleResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    if (r.status === 401) {
      // Solo redirigir a login si no estamos ya en la página de login
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized: Please login again");
    }
    const errorText = await r.text();
    throw new Error(errorText || r.statusText);
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
  return handleResponse<{ ok: true; id: number }>(r);
}

// Lista de dispositivos para poblar el selector
export async function getDevices() {
  const r = await fetch(`${BASE}/query/devices`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: string; last_seen: string | null }[]>(r);
}

// �ltima muestra por device_id (para las cards de Live Data)
export async function getLatest(device_id: string) {
  const r = await fetch(
    `${BASE}/query/latest?device_id=${encodeURIComponent(device_id)}`,
    { headers: getAuthHeaders() }
  );
  return handleResponse<{
    ts: string;
    temp_aire_c?: number | null;
    temp_piel_c?: number | null;
    humedad?: number | null;
    peso_g?: number | null;
  } | null>(r);
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
  const r = await fetch(`${BASE}/query/series${qs ? `?${qs}` : ""}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<SeriesPoint[]>(r);
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
  const r = await fetch(`${BASE}/alerts${qs ? `?${qs}` : ""}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(r);
}

export async function getModelStatus() {
  const r = await fetch(`${BASE}/models/status`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(r);
}

export async function retrainModel() {
  const r = await fetch(`${BASE}/models/retrain`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse(r);
}

// === Gestión de dispositivos ===
export async function getAvailableDevices() {
  const r = await fetch(`${BASE}/devices/available`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<DeviceRow[]>(r);
}

export async function linkDevice(device_id: string) {
  const r = await fetch(`${BASE}/devices/${encodeURIComponent(device_id)}/link`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: number; device_id: string; user_id: number | null; name: string | null }>(r);
}

export async function unlinkDevice(device_id: string) {
  const r = await fetch(`${BASE}/devices/${encodeURIComponent(device_id)}/unlink`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: number; device_id: string; user_id: number | null; name: string | null }>(r);
}
