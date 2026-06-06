"use client";



import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { formatDate } from "@/lib/utils";

import {

  Card,

  CardHeader,

  CardTitle,

  PageHeader,

  Badge,

  Table,

  Thead,

  Th,

  Td,

  Tr,

  SearchInput,

  FilterTabs,

  StatCard,

  EmptyState,

  ErrorBanner,

  Button,

} from "@/components/ui";

import { ShoppingBag, Building2, Loader2, Plus, ExternalLink } from "lucide-react";

import { getApiError } from "@/lib/services/auth.service";

import { pharmaciesService, type AdminPharmacyRow } from "@/lib/services/pharmacies.service";

import { partnersService, type BackendPartner } from "@/lib/services/partners.service";
import { OnboardSellerModal } from "@/components/pharmacies/onboard-seller-modal";



const TABS = ["Pharmacies", "Healthcare Companies"] as const;

const PHARM_ENTITY_STATUS = ["All", "active", "inactive", "suspended"] as const;

const PARTNER_STATUS = ["All", "active", "suspended", "inactive"] as const;



export default function PharmaciesPage() {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<(typeof TABS)[number]>("Pharmacies");

  const [search, setSearch] = useState("");

  const [pharmStatus, setPharmStatus] = useState<(typeof PHARM_ENTITY_STATUS)[number]>("All");

  const [partnerStatus, setPartnerStatus] = useState("All");

  const [pharmacies, setPharmacies] = useState<AdminPharmacyRow[]>([]);

  const [partners, setPartners] = useState<BackendPartner[]>([]);

  const [pharmTotal, setPharmTotal] = useState(0);

  const [partnerTotal, setPartnerTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [pharmError, setPharmError] = useState<string | null>(null);

  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [onboardOpen, setOnboardOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const load = () => {

    setLoading(true);

    setPharmError(null);

    setPartnerError(null);



    Promise.allSettled([

      pharmaciesService.getPharmacies({ limit: 100 }),

      partnersService.getPartners({ limit: 100 }),

    ])

      .then(([phResult, ptResult]) => {

        if (phResult.status === "fulfilled") {

          setPharmacies(phResult.value.items);

          setPharmTotal(phResult.value.total);

        } else {

          setPharmacies([]);

          setPharmTotal(0);

          setPharmError(getApiError(phResult.reason, "Failed to load pharmacies"));

        }



        if (ptResult.status === "fulfilled") {

          const companies = ptResult.value.items.filter(

            (p) => (p.company_type ?? "").toLowerCase() !== "pharmacy",

          );

          setPartners(companies);

          setPartnerTotal(companies.length);

        } else {

          setPartners([]);

          setPartnerTotal(0);

          setPartnerError(getApiError(ptResult.reason, "Failed to load healthcare companies"));

        }

      })

      .finally(() => setLoading(false));

  };



  useEffect(() => {

    load();

  }, []);



  const filteredPharms = pharmacies.filter((p) => {

    const matchSearch =

      !search ||

      p.name.toLowerCase().includes(search.toLowerCase()) ||

      p.district.toLowerCase().includes(search.toLowerCase()) ||

      p.adminEmail.toLowerCase().includes(search.toLowerCase());

    const entity = p.entityStatus.toLowerCase();

    const matchStatus = pharmStatus === "All" || entity === pharmStatus;

    return matchSearch && matchStatus;

  });



  const filteredPartners = partners.filter((p) => {

    const matchSearch =

      !search ||

      p.name.toLowerCase().includes(search.toLowerCase()) ||

      (p.email ?? "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = partnerStatus === "All" || p.status === partnerStatus;

    return matchSearch && matchStatus;

  });



  const error = pharmError && partnerError ? pharmError : tab === "Pharmacies" ? pharmError : partnerError;



  return (

    <div className="space-y-5">

      <PageHeader

        title="Pharmacies & Companies"

        subtitle="Register partners, set commission, and review B2B earnings"

        breadcrumb="Platform"

      >
        <Button size="sm" onClick={() => setOnboardOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Register {tab === "Pharmacies" ? "pharmacy" : "company"}
        </Button>
      </PageHeader>



      {error && <ErrorBanner message={error} onRetry={load} />}

      {partnerError && tab === "Pharmacies" && (

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">

          Healthcare companies could not be loaded: {partnerError}. Pharmacies tab still works.

        </p>

      )}



      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

        <StatCard label="Pharmacies" value={pharmTotal} icon={ShoppingBag} color="text-farumasi-700" />

        <StatCard label="Healthcare companies" value={partnerTotal} icon={Building2} color="text-purple-700" />

        <StatCard

          label="Active sellers"

          value={

            pharmacies.filter((p) => p.entityStatus === "Active").length +

            partners.filter((p) => p.status === "active").length

          }

          icon={ShoppingBag}

          color="text-emerald-700"

        />

      </div>



      <Card>

        <CardHeader>

          <div className="flex items-center gap-2">

            <ShoppingBag className="w-4 h-4 text-farumasi-600" />

            <CardTitle>Seller directory</CardTitle>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <FilterTabs options={[...TABS]} value={tab} onChange={setTab} />

            {tab === "Pharmacies" ? (

              <FilterTabs

                options={[...PHARM_ENTITY_STATUS]}

                value={pharmStatus}

                onChange={setPharmStatus}

              />

            ) : (

              <FilterTabs options={[...PARTNER_STATUS]} value={partnerStatus} onChange={setPartnerStatus} />

            )}

            <SearchInput

              value={search}

              onChange={setSearch}

              placeholder={tab === "Pharmacies" ? "Search pharmacies…" : "Search companies…"}

              className="w-52"

            />

          </div>

        </CardHeader>



        {loading ? (

          <p className="px-6 py-10 text-sm text-slate-400 flex items-center gap-2">

            <Loader2 className="w-4 h-4 animate-spin" /> Loading from API…

          </p>

        ) : tab === "Pharmacies" ? (

          <Table>

            <Thead>

              <tr>

                <Th>Pharmacy</Th>

                <Th>District</Th>

                <Th>Contact</Th>

                <Th>Entity status</Th>

                <Th>Store</Th>

                <Th>Verification</Th>

                <Th>Registered</Th>

                <Th>Actions</Th>

              </tr>

            </Thead>

            <tbody>

              {filteredPharms.length === 0 ? (

                <Tr>

                  <Td colSpan={8}>

                    <EmptyState

                      icon={ShoppingBag}

                      title="No pharmacies found"

                      description="Adjust search or status filters."

                    />

                  </Td>

                </Tr>

              ) : (

                filteredPharms.map((p) => (

                  <Tr key={p.id}>

                    <Td>

                      <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>

                      <p className="text-[11px] text-slate-400">{p.location || "—"}</p>

                    </Td>

                    <Td className="text-[12px] text-slate-600">{p.district || "—"}</Td>

                    <Td>

                      <p className="text-[12px] text-slate-700">{p.adminName || "—"}</p>

                      <p className="text-[11px] text-slate-400">{p.adminEmail || p.phone || "—"}</p>

                    </Td>

                    <Td>

                      <Badge

                        variant={

                          p.entityStatus === "Active"

                            ? "success"

                            : p.entityStatus === "Suspended"

                              ? "error"

                              : "neutral"

                        }

                      >

                        {p.entityStatus}

                      </Badge>

                    </Td>

                    <Td>
                      <Badge variant={p.storeOpen ? "success" : "warning"}>
                        {p.storeOpen ? "Open" : "Closed"}
                      </Badge>
                    </Td>

                    <Td>

                      <Badge variant={p.verificationStatus === "verified" ? "success" : "warning"}>

                        {p.verificationStatus}

                      </Badge>

                    </Td>

                    <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>

                    <Td>
                      <Link href={`/pharmacies/${p.id}`}>
                        <Button variant="outline" size="xs">
                          <ExternalLink className="w-3.5 h-3.5" /> View & earnings
                        </Button>
                      </Link>
                    </Td>

                  </Tr>

                ))

              )}

            </tbody>

          </Table>

        ) : (

          <Table>

            <Thead>

              <tr>

                <Th>Company</Th>

                <Th>Type</Th>

                <Th>District</Th>

                <Th>Verification</Th>

                <Th>Status</Th>

                <Th>Store</Th>

                <Th>Registered</Th>

                <Th>Actions</Th>

              </tr>

            </Thead>

            <tbody>

              {partnerError ? (

                <Tr>

                  <Td colSpan={8}>

                    <ErrorBanner message={partnerError} onRetry={load} />

                  </Td>

                </Tr>

              ) : filteredPartners.length === 0 ? (

                <Tr>

                  <Td colSpan={8}>

                    <EmptyState

                      icon={Building2}

                      title="No companies found"

                      description="Adjust search or status filters."

                    />

                  </Td>

                </Tr>

              ) : (

                filteredPartners.map((p) => (

                  <Tr key={p.id}>

                    <Td>

                      <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>

                      <p className="text-[11px] text-slate-400">{p.email ?? "—"}</p>

                    </Td>

                    <Td className="text-[12px] text-slate-500 capitalize">{p.company_type ?? "distributor"}</Td>

                    <Td className="text-[12px] text-slate-500">{p.district ?? "—"}</Td>

                    <Td>

                      <Badge variant={p.verification_status === "verified" ? "success" : "warning"}>

                        {p.verification_status}

                      </Badge>

                    </Td>

                    <Td>

                      <Badge variant={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>

                    </Td>

                    <Td>
                      <Badge variant={p.is_open !== false ? "success" : "warning"}>
                        {p.is_open !== false ? "Open" : "Closed"}
                      </Badge>
                    </Td>

                    <Td className="text-[12px] text-slate-400">{formatDate(p.created_at)}</Td>

                    <Td>
                      <Link href={`/pharmacies/companies/${p.id}`}>
                        <Button variant="outline" size="xs">
                          <ExternalLink className="w-3.5 h-3.5" /> View & earnings
                        </Button>
                      </Link>
                    </Td>

                  </Tr>

                ))

              )}

            </tbody>

          </Table>

        )}

      </Card>

      <OnboardSellerModal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onCreated={load}
        kind={tab === "Pharmacies" ? "pharmacy" : "partner"}
      />
    </div>

  );

}

