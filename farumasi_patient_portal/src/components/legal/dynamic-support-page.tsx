"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mail, MessageCircle, Phone, Loader2 } from "lucide-react";
import { RichContent } from "@/components/shared/rich-content";
import { contentService } from "@/lib/services/content.service";

export function DynamicSupportPage() {
  const [page, setPage] = useState<Awaited<ReturnType<typeof contentService.getPage>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentService.getPage("support").then(setPage).finally(() => setLoading(false));
  }, []);

  const meta = page?.contact_meta;
  const faq = meta?.faq ?? [];

  return (
    <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto min-w-0 pb-24">
      <Link href="/settings" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{page?.title ?? "Help & Support"}</h1>
      <p className="text-sm text-slate-500 mt-0.5">
        {page?.summary ?? "We're here for you, every step of the way."}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {page?.body && (
            <div className="mt-4 prose prose-sm max-w-none">
              <RichContent html={page.body} />
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {meta?.phone && (
              <ContactCard icon={Phone} label="Call us" value={meta.phone} href={`tel:${meta.phone.replace(/\s/g, "")}`} />
            )}
            {meta?.email && (
              <ContactCard icon={Mail} label="Email" value={meta.email} href={`mailto:${meta.email}`} />
            )}
            {meta?.whatsapp && (
              <ContactCard icon={MessageCircle} label="WhatsApp" value="Chat with us" href={meta.whatsapp} />
            )}
          </div>

          {faq.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-bold text-slate-900 uppercase tracking-wider">Frequently asked</h2>
              <div className="mt-3 space-y-2">
                {faq.map((item) => (
                  <details key={item.q} className="bg-white rounded-2xl border border-slate-100 p-4 group">
                    <summary className="text-sm font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between">
                      {item.q}
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 hover:border-farumasi-200 hover:shadow-sm transition-all"
    >
      <Icon className="w-5 h-5 text-farumasi-600" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </a>
  );
}
