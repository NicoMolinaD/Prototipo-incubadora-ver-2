export default function TopBar() {
  return (
    <div className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="font-semibold">Incubadora - Panel</div>
        <div className="text-xs text-slate-500">v0.1.0</div>
      </div>
    </div>
  );
}
