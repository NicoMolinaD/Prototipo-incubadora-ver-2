import { useEffect, useMemo, useState } from "react";
import { getDevices, getLatest, type DeviceRow, type MeasurementOut } from "../api/client";

function fmt(x?: number | null, u = "") {
  return x === null || x === undefined ? "--" : `${x.toFixed(1)}${u}`;
}

export default function LiveDataPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [latest, setLatest] = useState<MeasurementOut | null>(null);

  // carga lista de dispositivos (sin cache)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getDevices();
        if (!alive) return;
        setDevices(rows);
        if (!current && rows.length) setCurrent(rows[0].id);
      } catch (e) {
        console.error("getDevices failed", e);
      }
    })();
    const id = setInterval(() => {
      getDevices().then((rows) => {
        setDevices(rows);
        if (!current && rows.length) setCurrent(rows[0].id);
      }).catch(() => {});
    }, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [current]);

  // polling del ultimo valor
  useEffect(() => {
    if (!current) return;
    let alive = true;
    const tick = async () => {
      try {
        const row = await getLatest(current);
        if (alive) setLatest(row ?? null);
      } catch (e) {
        console.error("getLatest failed", e);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [current]);

  const lastSeen = useMemo(() => latest?.ts ?? null, [latest]);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border p-4">
        <div className="mb-2">Selecciona dispositivo</div>
        <select
          className="border rounded p-2"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.id}</option>
          ))}
        </select>
        <div className="text-sm mt-2">Last seen: {lastSeen ?? "--"}</div>
        <div className="text-right text-xs">Actualiza cada 5 s</div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card title="TS">{latest?.ts ?? "--"}</Card>
        <Card title="Aire (C)">{fmt(latest?.temp_aire_c)}</Card>
        <Card title="Piel (C)">{fmt(latest?.temp_piel_c)}</Card>
        <Card title="H (%)">{fmt(latest?.humedad)}</Card>
        <Card title="Peso (g)">{fmt(latest?.peso_g)}</Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm mb-2">{title}</div>
      <div className="text-2xl font-semibold">{children}</div>
    </div>
  );
}
