// frontend/pwa/src/api/types.ts
export type ISODate = string;

export interface DeviceRow {
  id: string;
  last_seen: ISODate | null;
}

export interface MeasurementOut {
  id: number;
  device_id: string;
  ts: ISODate;
  temp_piel_c?: number | null;
  temp_aire_c?: number | null;
  humedad?: number | null;
  luz?: number | null;
  ntc_raw?: number | null;
  ntc_c?: number | null;
  peso_g?: number | null;
  set_control?: number | null;
  alerts?: number | null;
}

export interface SeriesPoint {
  ts: ISODate;
  temp_piel_c?: number | null;
  temp_aire_c?: number | null;
  humedad?: number | null;
  luz?: number | null;
  peso_g?: number | null;
  alerts?: number | null;
}

export interface IngestPayload {
  device_id: string;
  ts?: ISODate;
  temp_piel_c?: number;
  temp_aire_c?: number;
  humedad?: number;
  luz?: number;
  ntc_raw?: number;
  ntc_c?: number;
  peso_g?: number;
  set_control?: number;
  alerts?: number;
}

export interface AlertRow {
  ts: ISODate;
  device_id?: string;
  label: string;
  code: number;
}

/** Estado de los modelos de ML */
export interface ModelStatus {
  name: string;              // p.ej. "anomaly-detector"
  version: string;           // p.ej. "v0.1.0"
  last_trained: ISODate | null;
  trained_by?: string | null;
  samples_used?: number | null;
  notes?: string | null;
}
