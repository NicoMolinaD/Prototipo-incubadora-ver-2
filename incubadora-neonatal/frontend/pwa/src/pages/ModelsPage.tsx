import { useEffect, useState } from "react";
import { getModelStatus, retrainModel } from "../api/client";
import type { ModelStatus } from "../api/types";

export default function ModelsPage() {
  const [st, setSt] = useState<ModelStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() { setSt(await getModelStatus()); }
  async function retrain() {
    setBusy(true);
    try { setSt(await retrainModel()); } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modelos</h1>

      <div className="card space-y-3">
        <div className="text-sm text-slate-600">
          Estado actual del modelo (stub). Al hacer reentrenar, el backend marca training=true y luego actualiza updated_at.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><div className="text-xs text-slate-500">Algo</div><div className="text-lg font-medium">{st?.algo ?? "--"}</div></div>
          <div><div className="text-xs text-slate-500">Version</div><div className="text-lg font-medium">{st?.version ?? "--"}</div></div>
          <div><div className="text-xs text-slate-500">Training</div><div className="text-lg font-medium">{st?.training ? "yes" : "no"}</div></div>
          <div><div className="text-xs text-slate-500">Updated at</div><div className="text-lg font-medium">{st?.updated_at?.replace("T"," ").slice(0,19) ?? "--"}</div></div>
        </div>

        <div>
          <button className="btn" onClick={retrain} disabled={busy || st?.training}>Reentrenar</button>
          <button className="btn ml-2" onClick={load} disabled={busy}>Refresh</button>
        </div>
      </div>
    </div>
  );
}
