import React, { useMemo, useState } from "react";
import {
  Search,
  LayoutDashboard,
  Activity,
  BellRing,
  Settings,
  Server,
  Database,
  FlaskConical,
  Tag,
  MoreHorizontal,
} from "lucide-react";

/**
 * Device Visualization ? Shell con sidebar funcional y paneles placeholder.
 * Incluye:
 *  - Menú lateral clicable: Dashboards, Live Data, Dispositivos, Alertas, Modelos, Configuración, Data Management
 *  - Panel ?Dispositivos? con tarjetas minimizadas (datos mock)
 *  - ?Data Management? con Events/Actions/Properties y 2 temperaturas (piel/aire)
 *  - Sin backend todavía (todo mock). Estética tipo PostHog con utilidades Tailwind.
 */

/* ------------------------- Utilidades & Datos Mock ------------------------- */

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const SAMPLE_DEVICES = [
  {
    id: "esp32s3-incu-01",
    name: "Incubadora A",
    status: "online" as const,
    lastSeen: "hace 2 min",
    fw: "1.0.0",
    sensors: {
      temp_piel_c: 36.7,
      temp_aire_c: 34.9,
      humedad: 55,
      luz: 120,
      peso_g: 3210,
    },
  },
  {
    id: "esp32s3-incu-02",
    name: "Incubadora B",
    status: "offline" as const,
    lastSeen: "hace 3 h",
    fw: "1.0.0",
    sensors: {
      temp_piel_c: 36.5,
      temp_aire_c: 35.1,
      humedad: 53,
      luz: 80,
      peso_g: 3185,
    },
  },
];

const EVENTS = [
  {
    name: "lectura_sensor",
    description:
      "Muestra periódica de sensores (piel/aire/humedad/luz/peso)",
    tags: ["monitoring", "telemetry"],
    volume30: 12890,
    queries30: 18,
    icon: <Activity className="h-4 w-4" />,
  },
  {
    name: "alerta_temperatura_piel",
    description: "Temperatura de piel fuera de rango",
    tags: ["alert", "temp_piel"],
    volume30: 190,
    queries30: 15,
    icon: <BellRing className="h-4 w-4" />,
  },
  {
    name: "alerta_temperatura_aire",
    description: "Temperatura de aire fuera de rango",
    tags: ["alert", "temp_aire"],
    volume30: 122,
    queries30: 9,
    icon: <BellRing className="h-4 w-4" />,
  },
];

const PROPERTIES = [
  { property: "temp_piel_c", type: "NUMERIC", tags: ["clinical"], example: "36.7" },
  { property: "temp_aire_c", type: "NUMERIC", tags: ["environment"], example: "35.0" },
  { property: "humedad", type: "NUMERIC", tags: [], example: "55.0" },
  { property: "luz", type: "NUMERIC", tags: [], example: "120" },
  { property: "peso_g", type: "NUMERIC", tags: ["peso"], example: "3200.5" },
  { property: "device_id", type: "STRING", tags: ["id"], example: "esp32s3-incu-01" },
];

const ACTIONS = [
  { name: "notificar_app", description: "Enviar notificación a PWA", tags: ["push"], uses30: 44 },
  { name: "activar_calefactor", description: "Activar relé de calefacción", tags: ["actuator", "temp"], uses30: 12 },
  { name: "activar_humidificador", description: "Activar relé de humedad", tags: ["actuator", "hum"], uses30: 9 },
];

/* ------------------------------- Átomos UI -------------------------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      <Tag className="h-3 w-3" /> {children}
    </span>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[12px] text-slate-500">{title}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="h-[220px] rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {subtitle && <div className="text-[12px] text-slate-500">{subtitle}</div>}
      <div className="grid h-[160px] place-items-center text-sm text-slate-500">
        (gráfico placeholder)
      </div>
    </div>
  );
}

function Gauge({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <div className="text-[12px] text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Placeholder({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-1 text-lg font-semibold">{title}</div>
      {children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <p className="text-sm text-slate-600">
          Página placeholder ? sin lógica aún. Aquí conectaremos con el backend
          más adelante.
        </p>
      )}
    </div>
  );
}

/* ------------------------------- Página Shell ------------------------------ */

export default function DataManagementPage() {
  type Section =
    | "dashboards"
    | "live"
    | "devices"
    | "alerts"
    | "models"
    | "settings"
    | "data";

  const [section, setSection] = useState<Section>("data");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EVENTS;
    return EVENTS.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q))
    );
  }, [query]);

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: "dashboards", label: "Dashboards", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "live", label: "Live Data", icon: <Activity className="h-4 w-4" /> },
    { key: "devices", label: "Dispositivos", icon: <Server className="h-4 w-4" /> },
    { key: "alerts", label: "Alertas", icon: <BellRing className="h-4 w-4" /> },
    { key: "models", label: "Modelos", icon: <FlaskConical className="h-4 w-4" /> },
    { key: "settings", label: "Configuración", icon: <Settings className="h-4 w-4" /> },
    { key: "data", label: "Data Management", icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 font-bold text-white">
                DV
              </div>
              <span className="text-sm font-semibold">Device Visualization</span>
            </div>
            <nav className="space-y-1">
              {navItems.map((it) => (
                <button
                  key={it.key}
                  onClick={() => setSection(it.key)}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                    section === it.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {it.icon}
                  <span className="truncate">{it.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Header + Search (solo en Data Management) */}
          {section === "data" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar eventos, tags o propiedades..."
                    className="h-9 w-72 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>
              </div>
              <p className="mb-6 max-w-3xl text-sm text-slate-600">
                Usa la gestión de datos para organizar los eventos del sistema de la incubadora.
                Reduce ruido, aclara el uso y ayuda al equipo a obtener el máximo valor de los datos.
              </p>
            </>
          )}

          {/* Panels */}
          {section === "dashboards" && <DashboardsPanel />}
          {section === "live" && <LiveDataPanel />}
          {section === "devices" && <DevicesPanel devices={SAMPLE_DEVICES} />}
          {section === "alerts" && <Placeholder title="Alertas" />}
          {section === "models" && <Placeholder title="Modelos" />}
          {section === "settings" && <Placeholder title="Configuración" />}
          {section === "data" && <DataPanel events={filteredEvents} />}
        </main>
      </div>
    </div>
  );
}

/* --------------------------------- Panels --------------------------------- */

function DashboardsPanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi title="Temp piel (avg)" value="36.7°C" />
        <Kpi title="Temp aire (avg)" value="35.0°C" />
        <Kpi title="Humedad (avg)" value="54%" />
        <Kpi title="Alertas 24h" value="12" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="Tendencia de temperatura" />
        <ChartCard title="Distribución de alertas" />
      </div>
    </div>
  );
}

function LiveDataPanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold tracking-tight">Live Data</div>
          <p className="text-sm text-slate-600">Telemetría en tiempo real (simulada por ahora).</p>
        </div>
        <select className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option>Todos los dispositivos</option>
          {SAMPLE_DEVICES.map((d) => (
            <option key={d.id}>
              {d.name} ? {d.id}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Gauge title="Temp piel" value="36.7°C" />
        <Gauge title="Temp aire" value="35.0°C" />
        <Gauge title="Humedad" value="54%" />
        <Gauge title="Luz" value="120" />
        <Gauge title="Peso" value="3210 g" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="Últimos 15 min" subtitle="Sparkline simulado" />
        <Placeholder title="Alert feed">
          <ul className="list-disc pl-5 text-sm text-slate-700">
            <li>(sim) 12:01 ? Alerta temperatura piel 37.8°C</li>
            <li>(sim) 12:00 ? Humedad 40% (borde inferior)</li>
          </ul>
        </Placeholder>
      </div>
    </div>
  );
}

function DevicesPanel({ devices }: { devices: typeof SAMPLE_DEVICES }) {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold tracking-tight">Dispositivos</div>
      <p className="mb-2 text-sm text-slate-600">
        Listado minimizado de dispositivos vinculados (placeholders).
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-sm text-slate-500">{d.id}</div>
                <div className="text-base font-semibold">{d.name}</div>
              </div>
              <span
                className={clsx(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  d.status === "online"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                )}
              >
                {d.status}
              </span>
            </div>

            <div className="mb-2 text-[12px] text-slate-500">
              FW {d.fw} · Última vez: {d.lastSeen}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Metric label="Temp piel" value={`${d.sensors.temp_piel_c.toFixed(1)}°C`} />
              <Metric label="Temp aire" value={`${d.sensors.temp_aire_c.toFixed(1)}°C`} />
              <Metric label="Humedad" value={`${d.sensors.humedad}%`} />
              <Metric label="Luz" value={String(d.sensors.luz)} />
              <Metric label="Peso" value={`${d.sensors.peso_g} g`} />
            </div>

            <div className="mt-3 flex items-center justify-end gap-1">
              <button
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                disabled
              >
                Ver
              </button>
              <button
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                disabled
              >
                Configurar
              </button>
              <button
                className="rounded-md border border-slate-200 bg-slate-50 p-1 text-slate-600"
                disabled
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function DataPanel({ events }: { events: typeof EVENTS }) {
  const [tab, setTab] = useState<"events" | "actions" | "properties">("events");

  return (
    <div className="space-y-6">
      <div className="mb-2 text-2xl font-bold tracking-tight">Data Management</div>

      {/* Tabs */}
      <div className="mb-3 flex gap-1">
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          Events
        </TabButton>
        <TabButton active={tab === "actions"} onClick={() => setTab("actions")}>
          Actions
        </TabButton>
        <TabButton active={tab === "properties"} onClick={() => setTab("properties")}>
          Properties
        </TabButton>
      </div>

      {tab === "events" && <EventsPanel events={events} />}
      {tab === "actions" && <ActionsPanel />}
      {tab === "properties" && <PropertiesPanel />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
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
              <td className="px-4 py-3 text-right tabular-nums">
                {e.volume30.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {e.queries30.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

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
                  <div className="text-[12px] text-slate-500">
                    {p.property === "peso_g" ? "Peso en gramos" : ""}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {p.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
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
              <div className="flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
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
            <td className="px-4 py-3">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                {p.type}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 text-right text-slate-600">{p.example}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
