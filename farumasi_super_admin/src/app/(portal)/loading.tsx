export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="h-3 w-64 rounded bg-slate-200" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 rounded-lg bg-slate-200" />
          <div className="h-8 w-24 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
            </div>
            <div className="h-7 w-20 rounded bg-slate-200" />
            <div className="h-3 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border p-5 space-y-3">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-52 rounded-lg bg-slate-100" />
        </div>
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="h-52 rounded-lg bg-slate-100" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-7 w-36 rounded-lg bg-slate-200" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-3.5 w-32 rounded bg-slate-200" />
            <div className="h-3.5 w-40 rounded bg-slate-200" />
            <div className="h-3.5 w-24 rounded bg-slate-200 ml-auto" />
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-6 w-16 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
