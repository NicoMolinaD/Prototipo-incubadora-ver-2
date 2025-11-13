import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function TopBar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="font-semibold">Incubadora - Panel</div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">
            {user?.username}
            {isAdmin && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1 rounded hover:bg-slate-100"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
