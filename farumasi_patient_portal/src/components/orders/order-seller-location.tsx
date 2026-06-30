"use client";

import { MapPin, Phone, Mail, Navigation, Store, Building2, ExternalLink } from "lucide-react";
import type { OrderSellerContact } from "@/types";

function mapsUrl(contact: OrderSellerContact): string {
  if (contact.latitude != null && contact.longitude != null) {
    return `https://www.google.com/maps?q=${contact.latitude},${contact.longitude}`;
  }
  const query = [contact.address, contact.district, contact.name, "Rwanda"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("250")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+250${digits.slice(1)}`;
  if (digits.length === 9) return `tel:+250${digits}`;
  return `tel:${phone}`;
}

function formatPhone(phone: string): string {
  return phone.trim();
}

export function OrderSellerLocation({ contact }: { contact: OrderSellerContact }) {
  const locationLine = [contact.address, contact.district].filter(Boolean).join(" · ");
  const maps = mapsUrl(contact);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-farumasi-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
          {contact.type === "partner" ? (
            <Building2 className="w-5 h-5 text-farumasi-600 dark:text-emerald-400" />
          ) : (
            <Store className="w-5 h-5 text-farumasi-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {contact.type === "partner" ? "Partner location" : "Pharmacy location"}
          </p>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{contact.name}</p>
          {contact.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{contact.description}</p>
          )}
          {locationLine ? (
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-2 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-farumasi-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{locationLine}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">Address not listed — contact the seller below.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {contact.phone && (
          <a
            href={telHref(contact.phone)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-farumasi-300 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-farumasi-600" />
            {formatPhone(contact.phone)}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:border-farumasi-300 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-farumasi-600" />
            Email
          </a>
        )}
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-semibold transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          Open in Maps
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>
      </div>
    </div>
  );
}
