import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

import LiveDataPage from "./pages/LiveDataPage";
import DataManagementPage from "./pages/DataManagementPage";
import DashboardsPage from "./pages/DashboardsPage";
import DevicesPage from "./pages/DevicesPage";
import AlertsPage from "./pages/AlertsPage";
import ModelsPage from "./pages/ModelsPage";
import SettingsPage from "./pages/SettingsPage";

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
              <Route path="/dashboards" element={<DashboardsPage />} />
              <Route path="/live" element={<LiveDataPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/data" element={<DataManagementPage />} />
              <Route path="*" element={<div className="card">404 - Ruta no encontrada</div>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
