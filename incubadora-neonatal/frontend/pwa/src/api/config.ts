// src/api/config.ts
// Helper para obtener la URL base de la API compatible con Capacitor Android
import { Capacitor } from '@capacitor/core';

/**
 * Obtiene la URL base de la API.
 * En web: usa VITE_API_BASE o location.origin + "/api/incubadora"
 * En Android nativo: usa VITE_API_BASE o una URL configurada por defecto
 */
export function getApiBaseUrl(): string {
  // Si hay una variable de entorno definida, usarla siempre
  const envBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (envBase && envBase.trim()) {
    return envBase.trim();
  }

  // Si estamos en Android nativo (Capacitor)
  if (Capacitor.isNativePlatform()) {
    // En Android, usar la IP del servidor o una URL configurada
    // Por defecto, intentar usar la IP local común para desarrollo
    // En producción, esto debería estar en VITE_API_BASE
    const storedUrl = localStorage.getItem('apiBase');
    if (storedUrl && storedUrl.trim()) {
      return storedUrl.trim();
    }
    // Fallback: usar localhost (funciona si el dispositivo está en la misma red)
    return 'http://10.0.2.2:8000/api/incubadora'; // 10.0.2.2 es el alias de localhost en el emulador Android
  }

  // En web, usar location.origin
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin + '/api/incubadora';
  }

  // Fallback final
  return 'http://localhost:8000/api/incubadora';
}

