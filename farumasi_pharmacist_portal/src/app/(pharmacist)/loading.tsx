export default function PharmacistLoading() {
  return (
    <div className="p-5 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-3 w-56 rounded bg-slate-200" />
          </div>
        </div>
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
            </div>
            <div className="h-7 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-7 w-28 rounded-lg bg-slate-200" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-40 rounded bg-slate-200" />
              <div className="h-3 w-28 rounded bg-slate-200" />
            </div>
            <div className="h-3.5 w-20 rounded bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-6 w-6 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
