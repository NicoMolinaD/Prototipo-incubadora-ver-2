import { useEffect, useState } from "react";
import { getDevices, getLatest, postIngest, type DeviceRow } from "../api/client";

export default function LiveDataPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await getDevices();
        if (!cancel) setDevices(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getLatest(30, selected);
        setSamples(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  async function connectBLE() {
    alert("Conexion BLE pendiente (placeholder).");
    // ejemplo de envio al backend:
    // await postIngest({ device_id: "ble:demo", temp_aire_c: 36.5, temp_piel_c: 36.0, humedad: 55, peso_g: 3200 });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Live Data</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Puente BLE (Codigo_base)</h2>
            <button onClick={connectBLE} className="btn">Conectar BLE</button>
          </div>
          <p className="text-sm text-slate-600">
            Este boton conectara al ESP32 por Web Bluetooth (HTTPS/localhost) y reenviara las muestras al backend.
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-medium mb-3">Dispositivos almacenados</h2>
          {devices.length === 0 ? (
            <div className="text-sm text-slate-500">Aun sin datos</div>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li key={d.device_id}>
                  <button
                    onClick={() => setSelected(d.device_id)}
                    className={
                      "w-full text-left px-3 py-2 rounded-md border " +
                      (selected === d.device_id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white hover:bg-slate-50 border-slate-200")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{d.device_id}</div>
                      <div className="text-xs text-slate-500">{d.last_seen?.replace("T", " ").slice(0, 19)}</div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Aire: {d.metrics.temp_aire_c ?? "?"}  Piel: {d.metrics.temp_piel_c ?? "?"}  H: {d.metrics.humedad ?? "?"}%  Peso: {d.metrics.peso_g ?? "?"} g
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-medium mb-3">Ultimas muestras {selected ? `- ${selected}` : ""}</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">TS</th>
                  <th className="py-2 pr-4">Aire (C)</th>
                  <th className="py-2 pr-4">Piel (C)</th>
                  <th className="py-2 pr-4">H (%)</th>
                  <th className="py-2 pr-4">Luz</th>
                  <th className="py-2 pr-4">Peso (g)</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} className="border-t border-slate-200">
                    <td className="py-2 pr-4">{s.ts.replace("T", " ").slice(0, 19)}</td>
                    <td className="py-2 pr-4">{s.temp_aire_c ?? "?"}</td>
                    <td className="py-2 pr-4">{s.temp_piel_c ?? "?"}</td>
                    <td className="py-2 pr-4">{s.humedad ?? "?"}</td>
                    <td className="py-2 pr-4">{s.luz ?? "?"}</td>
                    <td className="py-2 pr-4">{s.peso_g ?? "?"}</td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr><td className="py-2 text-slate-500" colSpan={6}>Selecciona un dispositivo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
