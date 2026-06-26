export default function Loading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-pulse">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
