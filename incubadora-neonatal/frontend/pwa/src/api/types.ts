// frontend/pwa/src/api/types.ts
export type ISODate = string;

// frontend/pwa/src/api/types.ts
export type DeviceRow = { 
  id: string; 
  last_seen: string | null;
  is_linked?: boolean;
  name?: string | null;
  metrics?: DeviceMetrics;
};

export type MeasurementOut = {
  ts: string;
  temp_aire_c?: number | null;
  temp_piel_c?: number | null;
  humedad?: number | null;
  peso_g?: number | null;
  alerts?: number | null;
};

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

/** Estado de los modelos de ML */
export interface ModelStatus {
  algo: string;
  version: string;
  training: boolean;
  updated_at: ISODate | null;
}



