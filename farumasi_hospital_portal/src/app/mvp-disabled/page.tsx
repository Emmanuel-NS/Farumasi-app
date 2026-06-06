export default function MvpDisabledPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-farumasi-600">
          FARUMASI MVP
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Hospital portal not in this release</h1>
        <p className="text-sm text-slate-600">
          The hospital portal uses mock data and is excluded from the current MVP deployment.
          Use the patient, pharmacist, partner, rider, or super-admin portals instead.
        </p>
        <p className="text-xs text-slate-400">
          Internal teams can set <code className="font-mono">NEXT_PUBLIC_MVP_PORTAL_ENABLED=true</code> to preview locally.
        </p>
      </div>
    </main>
  );
}
