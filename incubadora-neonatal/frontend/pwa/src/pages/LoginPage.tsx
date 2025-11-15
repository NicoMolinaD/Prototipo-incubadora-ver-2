import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).message) {
      setSuccess((location.state as any).message);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/live");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 transition-all">
        {/* Logo Marsupia */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo-marsupia.png"
            alt="Marsupia - Neonatal Incubator"
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain mb-4"
            onError={(e) => {
              // Fallback si la imagen no existe
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2" style={{ color: "#3b82f6" }}>
            MARSUPIA
          </h1>
          <p className="text-sm sm:text-base text-center text-slate-600">
            Neonatal Incubator
          </p>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4 text-slate-800">Iniciar sesión</h2>
        {success && (
          <div className="mb-4 text-green-600 text-sm text-center bg-green-50 border border-green-200 px-4 py-3 rounded">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 text-red-600 text-sm text-center">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Regístrate
          </Link>
        </p>
        <p className="mt-1 text-sm text-center">
          ¿Olvidaste tu contraseña?{' '}
          <span className="text-blue-600">Contacta al administrador</span>
        </p>
      </div>
    </div>
  );
}

