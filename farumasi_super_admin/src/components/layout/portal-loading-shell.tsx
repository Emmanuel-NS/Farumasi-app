/** Static shell — no animate-pulse (continuous repaints stress weak GPUs). */
export function PortalLoadingShell() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <div className="h-16 flex items-center px-4 gap-4 bg-farumasi-600 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white/20" />
        <div className="h-5 w-32 rounded bg-white/20" />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-60 bg-farumasi-700/40 shrink-0 p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-white/10" />
          ))}
        </div>
        <main className="flex-1 overflow-hidden p-6 bg-slate-50 rounded-tl-2xl">
          <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 h-24" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
