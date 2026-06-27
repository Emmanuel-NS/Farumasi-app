"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applicationsService } from "@/lib/services/applications.service";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";

const STATUS_COPY: Record<string, { title: string; body: string; tone: "amber" | "emerald" | "red" | "slate" }> = {
  submitted: {
    title: "Application submitted",
    body: "FARUMASI is reviewing your license and business details. You will receive access to trading once approved.",
    tone: "amber",
  },
  under_review: {
    title: "Under review",
    body: "Our compliance team is verifying your documents. You may be contacted if more information is needed.",
    tone: "amber",
  },
  approved: {
    title: "Application approved",
    body: "Your seller account is active. You can open the dashboard and configure listings.",
    tone: "emerald",
  },
  rejected: {
    title: "Application not approved",
    body: "Your application could not be approved at this time. See notes below or contact FARUMASI support.",
    tone: "red",
  },
};

export default function ApplicationStatusPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Awaited<ReturnType<typeof applicationsService.getMine>>>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login?next=/application-status");
      return;
    }
    applicationsService
      .getMine()
      .then((app) => {
        setApplication(app);
        if (app?.status === "approved") {
          router.replace("/dashboard");
        }
      })
      .catch((err) => toast.error(getApiError(err, "Could not load application status")))
      .finally(() => setLoading(false));
  }, [token, router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-farumasi-600" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">No seller application found for this account.</p>
          <Link href="/register">
            <Button className="w-full">Start an application</Button>
          </Link>
          <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:underline">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const copy = STATUS_COPY[application.status] ?? STATUS_COPY.submitted;
  const Icon = application.status === "approved" ? CheckCircle2 : application.status === "rejected" ? XCircle : Clock;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg w-full bg-white border rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              copy.tone === "emerald"
                ? "bg-emerald-100 text-emerald-700"
                : copy.tone === "red"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{copy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{copy.body}</p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border px-4 py-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Reference:</span>{" "}
            <strong>{application.application_code}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Business:</span> {application.business_name}
          </p>
          <p className="capitalize">
            <span className="text-muted-foreground">Type:</span> {application.seller_type}
          </p>
          <p className="capitalize">
            <span className="text-muted-foreground">Status:</span> {application.status.replace("_", " ")}
          </p>
        </div>

        {application.review_notes ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold text-xs uppercase tracking-wide mb-1">Review notes</p>
            <p>{application.review_notes}</p>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
          {application.status === "rejected" ? (
            <Link href="/register" className="flex-1">
              <Button className="w-full">Apply again</Button>
            </Link>
          ) : (
            <Button className="flex-1" variant="secondary" disabled>
              Awaiting FARUMASI review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
