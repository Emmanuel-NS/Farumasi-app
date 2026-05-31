export default function PatientLoading() {
  return (
    <div className="p-4 space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-200" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
      </div>

      {/* Search bar */}
      <div className="h-10 rounded-xl bg-slate-200" />

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-3 space-y-2">
            <div className="h-24 rounded-lg bg-slate-100" />
            <div className="h-3.5 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div className="h-7 rounded-lg bg-slate-200 mt-1" />
          </div>
        ))}
      </div>

      {/* List rows */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-40 rounded bg-slate-200" />
              <div className="h-3 w-28 rounded bg-slate-200" />
            </div>
            <div className="h-5 w-16 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
