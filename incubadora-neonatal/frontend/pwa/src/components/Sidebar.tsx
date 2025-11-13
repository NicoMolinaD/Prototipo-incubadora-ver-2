import { Link } from "react-router-dom";

interface SidebarItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const allItems: SidebarItem[] = [
  { to: "/dashboards", label: "Dashboards", icon: "?" },
  { to: "/live", label: "Live Data", icon: "?" },
  { to: "/devices", label: "Dispositivos", icon: "?" },
  { to: "/alerts", label: "Alertas", icon: "?" },
  { to: "/models", label: "Modelos", icon: "?", adminOnly: true },
  { to: "/settings", label: "Configuracion", icon: "??" },
  { to: "/data", label: "Data Management", icon: "??", adminOnly: true },
];

export default function Sidebar({ activePath, isAdmin }: { activePath: string; isAdmin: boolean }) {
  const items = allItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden lg:block fixed top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100">
      <div className="px-4 py-4 text-lg font-semibold">Device Visualization</div>
      <nav className="px-2 space-y-1">
        {items.map((it) => {
          const active = activePath.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm " +
                (active
                  ? "bg-slate-800 text-white"
                  : "text-slate-200 hover:bg-slate-800/60")
              }
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
