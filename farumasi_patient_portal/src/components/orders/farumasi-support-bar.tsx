"use client";

import { useEffect, useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { contentService } from "@/lib/services/content.service";

const FALLBACK_PHONE = "+250 788 000 000";
const FALLBACK_WHATSAPP = "https://wa.me/250788000000";

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("250")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+250${digits.slice(1)}`;
  return `tel:+${digits}`;
}

export function FarumasiSupportBar() {
  const [phone, setPhone] = useState(FALLBACK_PHONE);
  const [whatsapp, setWhatsapp] = useState(FALLBACK_WHATSAPP);

  useEffect(() => {
    contentService
      .getPage("support")
      .then((page) => {
        if (page.contact_meta?.phone) setPhone(page.contact_meta.phone);
        if (page.contact_meta?.whatsapp) setWhatsapp(page.contact_meta.whatsapp);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mt-6 mb-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
        Need help with this order?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={telHref(phone)}
          className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 hover:border-farumasi-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-farumasi-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-farumasi-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">FARUMASI helpline</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{phone}</p>
          </div>
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 hover:border-emerald-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">WhatsApp support</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Chat with FARUMASI</p>
          </div>
        </a>
      </div>
    </div>
  );
}
