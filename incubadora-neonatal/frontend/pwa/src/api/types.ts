export type DeviceSummary = {
  device_id: string;
  last_seen: string;
  status: "online" | "offline";
  metrics: {
    temp_piel_c?: number;
    temp_aire_c?: number;
    humedad?: number;
    luz?: number;
    peso_g?: number;
  };
};

export type Measurement = {
  id: number;
  device_id: string;
  ts: string;
  temp_piel_c?: number;
  temp_aire_c?: number;
  humedad?: number;
  luz?: number;
  ntc_c?: number;
  ntc_raw?: number;
  peso_g?: number;
};
