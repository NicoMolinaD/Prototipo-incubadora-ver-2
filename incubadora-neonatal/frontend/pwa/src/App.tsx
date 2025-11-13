import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreateFirstAdminPage from "./pages/CreateFirstAdminPage";
import LiveDataPage from "./pages/LiveDataPage";
import DataManagementPage from "./pages/DataManagementPage";
import DashboardsPage from "./pages/DashboardsPage";
import DevicesPage from "./pages/DevicesPage";
import AlertsPage from "./pages/AlertsPage";
import ModelsPage from "./pages/ModelsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";

function AppRoutes() {
  const loc = useLocation();
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/create-first-admin" element={<CreateFirstAdminPage />} />
        <Route
          path="*"
          element={
            <div className="flex">
              {sidebarOpen && (
                <div
                  className="fixed inset-0 bg-black/40 z-20"
                  onClick={toggleSidebar}
                />
              )}
              <Sidebar
                activePath={loc.pathname}
                isAdmin={isAdmin}
                isOpen={sidebarOpen}
                toggle={toggleSidebar}
              />
              <main
                className={`flex-1 transition-all duration-300 ${
                  sidebarOpen ? "ml-64" : "ml-0 lg:ml-64"
                }`}
              >
                <TopBar toggleSidebar={toggleSidebar} />
                <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">
                  <Routes>
                    <Route path="/" element={<Navigate to="/live" replace />} />
                    <Route
                      path="/dashboards"
                      element={
                        <ProtectedRoute>
                          <DashboardsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/live"
                      element={
                        <ProtectedRoute>
                          <LiveDataPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/devices"
                      element={
                        <ProtectedRoute>
                          <DevicesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/alerts"
                      element={
                        <ProtectedRoute>
                          <AlertsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/models"
                      element={
                        <ProtectedRoute requireAdmin>
                          <ModelsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/data"
                      element={
                        <ProtectedRoute requireAdmin>
                          <DataManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute requireAdmin>
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<div className="card">404 - Ruta no encontrada</div>} />
                  </Routes>
                </div>
              </main>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
