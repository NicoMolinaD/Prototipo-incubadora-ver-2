import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

type Theme = "light" | "dark" | "blue" | "green" | "purple";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme, colors } = useTheme();
  const [apiBase, setApiBase] = useState<string>(localStorage.getItem("apiBase") || "");
  const [retention, setRetention] = useState<number>(parseInt(localStorage.getItem("retention") || "30"));
  const [email, setEmail] = useState<string>(user?.email || "");
  const [username, setUsername] = useState<string>(user?.username || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setUsername(user.username);
    }
  }, [user]);

  function saveSettings() {
    localStorage.setItem("apiBase", apiBase);
    localStorage.setItem("retention", String(retention));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const themes: { value: Theme; label: string; preview: string }[] = [
    { value: "light", label: "Claro", preview: "☀️" },
    { value: "dark", label: "Oscuro", preview: "🌙" },
    { value: "blue", label: "Azul", preview: "🔵" },
    { value: "green", label: "Verde", preview: "🟢" },
    { value: "purple", label: "Morado", preview: "🟣" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Gestiona tu cuenta y preferencias de la aplicación
        </p>
      </div>

      {/* Configuración de Cuenta */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text }}>
          Información de Cuenta
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Nombre de Usuario
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
                focusRingColor: colors.primary,
              }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled
              title="El nombre de usuario no se puede cambiar"
            />
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              El nombre de usuario no se puede modificar
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
              title="El correo electrónico no se puede cambiar desde aquí"
            />
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Contacta a un administrador para cambiar tu correo
            </p>
          </div>

          {user?.is_admin && (
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                👑 Administrador
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Configuración de Apariencia */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text }}>
          Apariencia
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
              Tema de Color
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    theme === t.value ? "ring-2 ring-offset-2" : ""
                  }`}
                  style={{
                    backgroundColor: theme === t.value ? colors.primary : colors.card,
                    borderColor: theme === t.value ? colors.primary : colors.border,
                    color: theme === t.value ? "white" : colors.text,
                    ringColor: colors.primary,
                  }}
                >
                  <div className="text-3xl mb-2">{t.preview}</div>
                  <div className="text-sm font-medium">{t.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
              Selecciona un tema para personalizar la apariencia de la aplicación
            </p>
          </div>
        </div>
      </div>

      {/* Configuración Avanzada */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.text }}>
          Configuración Avanzada
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              URL Base de la API
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
              placeholder="http://localhost:8000"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Solo visual. El cliente usa la URL configurada en el build.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Retención de Datos (días)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              className="w-40 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text,
              }}
              value={retention}
              onChange={(e) => setRetention(parseInt(e.target.value || "0"))}
            />
            <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              Período de retención de datos históricos (7-365 días)
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={saveSettings}
              className="btn px-6 py-2 font-medium transition-all hover:shadow-lg"
              style={{
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
              }}
            >
              {saved ? "✓ Guardado" : "Guardar Configuración"}
            </button>
            {saved && (
              <span className="ml-3 text-sm" style={{ color: colors.accent }}>
                Configuración guardada exitosamente
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
