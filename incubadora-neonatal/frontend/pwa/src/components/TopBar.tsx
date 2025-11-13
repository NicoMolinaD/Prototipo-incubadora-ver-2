import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface TopBarProps {
  toggleSidebar: () => void;
}

export default function TopBar({ toggleSidebar }: TopBarProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="text-white hover:text-slate-200 focus:outline-none lg:hidden"
            aria-label="Abrir menú"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
              />
            </svg>
          </button>
          <div className="font-semibold text-lg">MARSUPIA</div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-sm text-slate-100">
              {user.username}
              {isAdmin && <span className="ml-2 text-xs bg-white/20 text-white px-2 py-1 rounded">Admin</span>}
            </div>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Cerrar sesión
            </button>
          )}
          <span className="text-xs text-slate-200">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
