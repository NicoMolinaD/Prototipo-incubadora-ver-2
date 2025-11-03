import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import LiveDataPage from "./pages/LiveDataPage";
import DataManagementPage from "./pages/DataManagementPage";

export default function App() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar activePath={loc.pathname} />
        <main className="flex-1 ml-0 lg:ml-64">
          <TopBar />
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
            <Routes>
              <Route path="/" element={<Navigate to="/live" replace />} />
              <Route path="/live" element={<LiveDataPage />} />
              <Route path="/data" element={<DataManagementPage />} />
              {/* placeholders para otras secciones */}
              <Route path="/dashboards" element={<div className="card">Dashboards (placeholder)</div>} />
              <Route path="/devices" element={<div className="card">Dispositivos (placeholder)</div>} />
              <Route path="/alerts" element={<div className="card">Alertas (placeholder)</div>} />
              <Route path="/models" element={<div className="card">Modelos (placeholder)</div>} />
              <Route path="/settings" element={<div className="card">Configuración (placeholder)</div>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
