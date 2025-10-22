import React, { useMemo, useState } from "react";
import { Search, LayoutDashboard, Activity, BellRing, Settings, Server, Database, FlaskConical, ChevronRight, Tag } from "lucide-react";

// --- Utilidades simples ---
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// --- Placeholders de dominio Incubadora ---
const EVENTS = [
  {
    name: "lectura_sensor",
    description: "Muestra periódica de sensores (T/H/Luz/NTC/Peso)",
    tags: ["monitoring", "telemetry"],
    volume30: 12890,
    queries30: 18,
    icon: <Activity className="h-4 w-4" />,
  },
  {
    name: "alerta_temperatura",
    description: "Evento de alerta por temperatura fuera de rango",
    tags: ["alert", "temp"],
    volume30: 312,
    queries30: 22,
    icon: <BellRing className="h-4 w-4" />,
  },
  {
    name: "peso_actualizado",
    description: "Actualización de peso en gramos",
    tags: ["peso", "monitoring"],
    volume30: 6050,
    queries30: 9,
    icon: <Database className="h-4 w-4" />,
  },
];

const PROPERTIES = [
  { property: "temperatura", type: "NUMERIC", tags: ["clinical"], example: "36.7" },
  { property: "humedad", type: "NUMERIC", tags: [], example: "55.0" },
  { property: "luz", type: "NUMERIC", tags: [], example: "120" },
  { property: "ntc_c", type: "NUMERIC", tags: ["sensor"], example: "36.5" },
  { property: "peso_g", type: "NUMERIC", tags: ["peso"], example: "3200.5" },
  { property: "device_id", type: "STRING", tags: ["id"], example: "esp32s3-incu-01" },
];

const ACTIONS = [
  { name: "notificar_app", description: "Enviar notificación a PWA", tags: ["push"], uses30: 44 },
  { name: "activar_calefactor", description: "Activar rele de calefacción", tags: ["actuator", "temp"], uses30: 12 },
  { name: "activar_humidificador", description: "Activar rele de humedad", tags: ["actuator", "hum"], uses30: 9 },
];

// --- Chips ---
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <Tag className="h-3 w-3" /> {children}
    </span>
  );
}

// --- Tabla genérica ---
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export default function DataManagementPage() {
  const [tab, setTab] = useState<"events" | "actions" | "properties">("events");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EVENTS;
    return EVENTS.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.tags.some(t => t.includes(q))
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Layout */}
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-white font-bold">I</div>
              <span className="text-sm font-semibold">Incubadora</span>
            </div>
            <nav className="space-y-1">
              <NavItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboards" active={false} />
              <NavItem icon={<Activity className="h-4 w-4" />} label="Live Data" active={false} />
              <NavItem icon={<Server className="h-4 w-4" />} label="Dispositivos" active={false} />
              <NavItem icon={<BellRing className="h-4 w-4" />} label="Alertas" active={false} />
              <NavItem icon={<FlaskConical className="h-4 w-4" />} label="Modelos" active={false} />
              <NavItem icon={<Settings className="h-4 w-4" />} label="Configuración" active={false} />
              <NavItem icon={<Database className="h-4 w-4" />} label="Data Management" active />
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Incubadora</span>
            <ChevronRight className="h-4 w-4" />
            <span>Demo (Local)</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-700">Data Management</span>
          </div>

          {/* Title + Search */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar eventos, tags o propiedades..."
                className="h-9 w-72 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
          </div>
          <p className="mb-6 max-w-3xl text-sm text-slate-600">
            Usa la gestión de datos para organizar los eventos del sistema de la incubadora. Reduce ruido, aclara el uso y
            ayuda al equipo a obtener el máximo valor de los datos.
          </p>

          {/* Tabs */}
          <div className="mb-3 flex gap-1">
            <TabButton active={tab === "events"} onClick={() => setTab("events")}>Events</TabButton>
            <TabButton active={tab === "actions"} onClick={() => setTab("actions")}>Actions</TabButton>
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")}>Properties</TabButton>
          </div>

          {/* Panels */}
          {tab === "events" && <EventsPanel events={filteredEvents} />}
          {tab === "actions" && <ActionsPanel />}
          {tab === "properties" && <PropertiesPanel />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={clsx(
      "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
    )}>
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-md px-3 py-1.5 text-sm font-medium",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );
}

function EventsPanel({ events }: { events: typeof EVENTS }) {
  return (
    <div className="space-y-6">
      {/* Tabla de eventos */}
      <Table>
        <thead>
          <tr className="bg-slate-50 text-left text-[12px] uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Tags</th>
            <th className="px-4 py-3 text-right">30 day volume</th>
            <th className="px-4 py-3 text-right">30 day queries</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, idx) => (
            <tr key={idx} className="border-t border-slate-200 text-sm">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-slate-600">{e.icon}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{e.name}</div>
                    <div className="text-[12px] text-slate-500">{e.description}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {e.tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{e.volume30.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums">{e.queries30.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Top properties */}
      <div>
        <div className="mb-2 text-sm font-semibold text-slate-900">Top properties</div>
        <Table>
          <thead>
            <tr className="bg-slate-50 text-left text-[12px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Example</th>
            </tr>
          </thead>
          <tbody>
            {PROPERTIES.map((p) => (
              <tr key={p.property} className="border-t border-slate-200 text-sm">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{p.property}</div>
                  <div className="text-[12px] text-slate-500">{p.property === "temperatura" ? "No hay descripción para esta propiedad" : p.property === "peso_g" ? "Peso en gramos" : ""}</div>
                </td>
                <td className="px-4 py-3"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">{p.type}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{p.example}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

function ActionsPanel() {
  return (
    <Table>
      <thead>
        <tr className="bg-slate-50 text-left text-[12px] uppercase tracking-wider text-slate-500">
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Tags</th>
          <th className="px-4 py-3 text-right">30 day uses</th>
        </tr>
      </thead>
      <tbody>
        {ACTIONS.map((a) => (
          <tr key={a.name} className="border-t border-slate-200 text-sm">
            <td className="px-4 py-3">
              <div className="font-semibold text-slate-900">{a.name}</div>
              <div className="text-[12px] text-slate-500">{a.description}</div>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">{a.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
            </td>
            <td className="px-4 py-3 text-right">{a.uses30}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function PropertiesPanel() {
  return (
    <Table>
      <thead>
        <tr className="bg-slate-50 text-left text-[12px] uppercase tracking-wider text-slate-500">
          <th className="px-4 py-3">Property</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Tags</th>
          <th className="px-4 py-3 text-right">Example</th>
        </tr>
      </thead>
      <tbody>
        {PROPERTIES.map((p) => (
          <tr key={p.property} className="border-t border-slate-200 text-sm">
            <td className="px-4 py-3 font-medium text-slate-900">{p.property}</td>
            <td className="px-4 py-3"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">{p.type}</span></td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
            </td>
            <td className="px-4 py-3 text-right text-slate-600">{p.example}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
