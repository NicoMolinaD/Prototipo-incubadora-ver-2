import { Link } from "react-router-dom";

interface SidebarItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const allItems: SidebarItem[] = [
  { to: "/live", label: "Live Data", icon: "📈" },
  { to: "/devices", label: "Dispositivos", icon: "🔌" },
  { to: "/alerts", label: "Alertas", icon: "🔔" },
  { to: "/models", label: "Modelos", icon: "🤖", adminOnly: true },
  { to: "/settings", label: "Configuracion", icon: "⚙️" },
  { to: "/data", label: "Data Management", icon: "🗂", adminOnly: true },
  { to: "/users", label: "Usuarios", icon: "👥", adminOnly: true },
];

interface SidebarProps {
  activePath: string;
  isAdmin: boolean;
  isOpen: boolean;
  toggle: () => void;
}

export default function Sidebar({ activePath, isAdmin, isOpen, toggle }: SidebarProps) {
  const items = allItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 transform transition-transform duration-300 z-30 flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="px-4 py-4 text-lg font-semibold flex items-center justify-between">
        <span>MARSUPIA</span>
        <button
          onClick={toggle}
          className="lg:hidden text-slate-100 hover:text-white focus:outline-none"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>
      <nav className="px-2 space-y-1 flex-1">
        {items.map((it) => {
          const active = activePath.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white")
              }
              onClick={() => {
                if (isOpen) toggle();
              }}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* Logo Marsupia en la parte inferior */}
      <div className="px-4 py-4 border-t border-slate-700 flex flex-col items-center justify-center">
        <img
          src="/logo-marsupia.png"
          alt="Marsupia - Neonatal Incubator"
          className="w-20 h-20 object-contain mb-2"
          style={{ maxWidth: "80px", maxHeight: "80px" }}
          onError={(e) => {
            // Fallback si la imagen no existe - mostrar texto alternativo
            const target = e.target as HTMLImageElement;
            const parent = target.parentElement;
            if (parent) {
              target.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className = "w-20 h-20 flex items-center justify-center mb-2 text-slate-400 text-4xl";
              fallback.textContent = "🦘";
              parent.insertBefore(fallback, target.nextSibling);
            }
          }}
        />
        <p className="text-xs text-slate-400 text-center font-medium">
          MARSUPIA
        </p>
        <p className="text-xs text-slate-500 text-center">
          Neonatal Incubator
        </p>
      </div>
    </aside>
  );
}
