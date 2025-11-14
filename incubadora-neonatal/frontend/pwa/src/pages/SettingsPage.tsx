import { useState } from "react";

export default function SettingsPage() {
  const [apiBase, setApiBase] = useState<string>(localStorage.getItem("apiBase") || "");
  const [retention, setRetention] = useState<number>(parseInt(localStorage.getItem("retention") || "30"));

  function save() {
    localStorage.setItem("apiBase", apiBase);
    localStorage.setItem("retention", String(retention));
    alert("Preferencias guardadas localmente");
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>

      <div className="card space-y-4">
        <div>
          <label className="text-sm text-slate-600">API base URL</label>
          <input
            className="mt-1 w-full border rounded-md px-3 py-2 border-slate-300"
            placeholder="http://localhost:8000"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
          />
          <div className="text-xs text-slate-500 mt-1">
            Solo visual. El cliente usa la URL configurada en el build.
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600">Retencion de datos (dias)</label>
          <input
            type="number"
            min={7}
            className="mt-1 w-40 border rounded-md px-3 py-2 border-slate-300"
            value={retention}
            onChange={(e) => setRetention(parseInt(e.target.value || "0"))}
          />
        </div>

        <div>
          <button className="btn" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
