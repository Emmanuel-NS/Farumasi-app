import { SIDEBAR_WIDTH_EXPANDED } from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

/** Auth / layout bootstrap skeleton — shared so SSR and client markup stay identical. */
export function PortalLoadingShell() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <div className="h-14 flex items-center px-4 gap-4 bg-farumasi-600">
        <div className="w-7 h-7 rounded bg-white/20" />
        <div className="h-5 w-28 rounded bg-white/20" />
        <div className="ml-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white/20" />
          <div className="w-7 h-7 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className={cn(
            SIDEBAR_WIDTH_EXPANDED,
            "bg-farumasi-700/40 shrink-0 p-3 space-y-2",
          )}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-white/10" />
          ))}
        </div>
        <main className="flex-1 overflow-hidden p-6 bg-slate-50 rounded-tl-2xl">
          <div className="space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="h-3 w-48 rounded bg-slate-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="h-7 w-20 rounded bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border p-5 h-52 space-y-3">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-40 rounded-lg bg-slate-100" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
