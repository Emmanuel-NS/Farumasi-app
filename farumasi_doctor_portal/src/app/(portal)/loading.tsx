export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200" />
          <div className="space-y-1">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-3 w-60 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-8 w-28 rounded-lg bg-slate-200" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-slate-100" />
                <div className="h-7 w-16 rounded bg-slate-200" />
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100" />
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
          <div className="h-4 w-40 rounded bg-slate-200 mb-4" />
          <div className="h-48 rounded bg-slate-50" />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="h-4 w-32 rounded bg-slate-200 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="h-3 flex-1 rounded bg-slate-100" />
                <div className="h-3 w-8 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="h-4 w-36 rounded bg-slate-200 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-32 rounded bg-slate-200" />
                <div className="h-2.5 w-48 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-100" />
              <div className="h-3 w-12 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
