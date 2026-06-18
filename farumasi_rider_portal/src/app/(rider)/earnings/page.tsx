"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, TrendingUp, Calendar } from "lucide-react";
import { riderService, type RiderEarnings } from "@/lib/services/rider.service";
import { RiderBottomNav } from "../deliveries/page";

export default function EarningsPage() {
  const [data, setData] = useState<RiderEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    riderService
      .getEarnings()
      .then(setData)
      .catch(() => toast.error("Could not load earnings"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-24">
      <header className="bg-white border-b border-slate-100 px-4 py-5">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-xl text-slate-900">Earnings</h1>
          <p className="text-sm text-slate-500">Your delivery income</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-slate-400 py-12">Loading…</p>
        ) : data ? (
          <>
            <div className="bg-farumasi-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-farumasi-100 text-sm">Pending payout</p>
              <p className="text-3xl font-bold mt-1">
                RWF {Math.round(data.pending_payout).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                icon={Calendar}
                label="Today"
                value={`RWF ${Math.round(data.estimated_earnings_today).toLocaleString()}`}
                sub={`${data.completed_deliveries_today} trips`}
              />
              <Stat
                icon={TrendingUp}
                label="This week"
                value={`RWF ${Math.round(data.estimated_earnings_week).toLocaleString()}`}
              />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
                <Wallet className="w-4 h-4 text-farumasi-600" />
                Payouts
              </p>
              Payout requests are processed by FARUMASI finance. Contact support if your balance
              has not been paid out after requesting from the mobile app.
            </div>
          </>
        ) : (
          <p className="text-center text-slate-400">No earnings data</p>
        )}
      </div>

      <RiderBottomNav />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <Icon className="w-5 h-5 text-farumasi-600 mb-2" />
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
