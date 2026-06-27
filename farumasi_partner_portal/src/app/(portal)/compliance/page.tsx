"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import api from "@/lib/api";
import { getSellerMeBase } from "@/lib/seller-api";
import { partnerService, type BackendPartnerCompany } from "@/lib/services/partner.service";
import { pharmacyService, type BackendPharmacy } from "@/lib/services/pharmacy.service";

const DISPATCH_VS_LISTING = [
  {
    title: "Listing batch (inventory)",
    body: "Optional stock reference when you edit a listing. Used for your own inventory tracking.",
  },
  {
    title: "Dispatch batch (RFDA handover)",
    body: "Mandatory when you confirm dispatch on an order. Records the exact batch, expiry, and manufacturer of medicines given to the patient or rider.",
  },
];

export default function CompliancePage() {
  const user = useAuthStore((s) => s.user);
  const isPharmacy = user?.role === "pharmacy_admin" || user?.role === "pharmacist";
  const [partner, setPartner] = useState<BackendPartnerCompany | null>(null);
  const [pharmacy, setPharmacy] = useState<BackendPharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (isPharmacy) {
          const p = await pharmacyService.getMine();
          if (!cancelled) setPharmacy(p);
        } else {
          const p = await partnerService.getMine();
          if (!cancelled) setPartner(p);
        }
      } catch {
        try {
          const { data } = await api.get(`${getSellerMeBase()}`);
          if (!cancelled) {
            if (isPharmacy) setPharmacy(data as BackendPharmacy);
            else setPartner(data as BackendPartnerCompany);
          }
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isPharmacy]);

  const verificationStatus = partner?.verification_status ?? pharmacy?.verification_status;
  const entityStatus = partner?.status ?? pharmacy?.status;
  const isVerified = verificationStatus === "verified" && entityStatus === "active";

  const checklist = isPharmacy
    ? [
        { label: "Pharmacy operating license on file", ok: Boolean(pharmacy?.license_number) },
        { label: "Business location verified", ok: Boolean(pharmacy?.latitude && pharmacy?.longitude) },
        { label: "Account verified by FARUMASI", ok: isVerified },
      ]
    : [
        { label: "Regulatory license number", ok: Boolean(partner?.regulatory_license_number) },
        { label: "License document uploaded", ok: Boolean(partner?.regulatory_license_document_url) },
        { label: "Business registration", ok: Boolean(partner?.business_registration_number) },
        { label: "Account verified by FARUMASI", ok: isVerified },
      ];

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading compliance profile…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Compliance & traceability"
        description="Regulatory status, dispatch accountability, and RFDA-ready records"
        icon={ShieldCheck}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">Update profile</Link>
          </Button>
        }
      />

      <Card className={cn(isVerified ? "border-emerald-200" : "border-amber-200")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isVerified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            Verification status
          </CardTitle>
          <CardDescription>
            {isPharmacy ? "Licensed pharmacy seller" : "Partner company seller"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {verificationStatus && (
            <Badge className="capitalize">{verificationStatus.replace(/_/g, " ")}</Badge>
          )}
          {entityStatus && (
            <Badge variant="outline" className="capitalize">{entityStatus.replace(/_/g, " ")}</Badge>
          )}
          {!isVerified && (
            <p className="text-sm text-amber-800 w-full mt-2">
              Listing changes are blocked until FARUMASI verifies your license. You can still view orders and prepare
              your profile.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              {item.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dispatch traceability (RFDA)
          </CardTitle>
          <CardDescription>
            Every order handover requires batch number, expiry date, manufacturer, and patient access code verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DISPATCH_VS_LISTING.map((row) => (
            <div key={row.title} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{row.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.body}</p>
            </div>
          ))}
          <Button variant="outline" size="sm" className="text-xs gap-1" asChild>
            <Link href="/orders">
              View orders <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {(partner?.created_at || pharmacy?.created_at) && (
        <p className="text-xs text-muted-foreground text-center">
          On FARUMASI since {formatDate(partner?.created_at ?? pharmacy?.created_at ?? "", true)}
        </p>
      )}
    </div>
  );
}
