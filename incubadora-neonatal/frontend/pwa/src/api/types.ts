// frontend/pwa/src/api/types.ts
export type ISODate = string;

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
  device_id?: string;
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
  mask: number;
  labels: string[];
}

export interface DeviceMetrics {
  temp_aire_c?: number | null;
  temp_piel_c?: number | null;
  humedad?: number | null;
  peso_g?: number | null;
}

export interface DeviceRow {
  id: string;
  last_seen: ISODate | null;
  metrics?: DeviceMetrics | null;
}

/** Estado de los modelos de ML */
export interface ModelStatus {
  algo: string;
  version: string;
  training: boolean;
  updated_at: ISODate | null;
}



