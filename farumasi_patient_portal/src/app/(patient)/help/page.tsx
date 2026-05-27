import Link from "next/link";
import { ChevronLeft, Mail, MessageCircle, Phone } from "lucide-react";

export const metadata = { title: "Help & Support · Farumasi" };

const FAQ = [
  {
    q: "How do I order medicine?",
    a: "Browse the Store, add items to your cart, then check out. We'll match you to the nearest verified pharmacy that has all your items in stock.",
  },
  {
    q: "Can I upload a prescription?",
    a: "Yes. Go to Prescriptions → New, then upload a photo or PDF. A licensed pharmacist will review it before dispensing.",
  },
  {
    q: "How long does delivery take?",
    a: "Most Kigali deliveries arrive within 60 minutes. Out-of-Kigali timing depends on the pharmacy and rider availability.",
  },
  {
    q: "What payment methods are supported?",
    a: "Mobile Money (MTN, Airtel), card payments, and selected insurance providers. You'll see the available methods at checkout.",
  },
  {
    q: "How do I cancel an order?",
    a: "Open the order from Orders → tap Cancel. Cancellation is free until the pharmacy starts preparing your items.",
  },
];

export default function HelpPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <Link href="/settings" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
      <p className="text-sm text-slate-500 mt-0.5">We&apos;re here for you, every step of the way.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ContactCard icon={Phone} label="Call us" value="+250 788 000 000" href="tel:+250788000000" />
        <ContactCard icon={Mail}  label="Email"    value="support@farumasi.com" href="mailto:support@farumasi.com" />
        <ContactCard icon={MessageCircle} label="WhatsApp" value="Chat with us" href="https://wa.me/250788000000" />
      </div>

      <h2 className="mt-8 text-sm font-bold text-slate-900 uppercase tracking-wider">Frequently asked</h2>
      <div className="mt-3 space-y-2">
        {FAQ.map((item) => (
          <details key={item.q} className="bg-white rounded-2xl border border-slate-100 p-4 group">
            <summary className="text-sm font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between">
              {item.q}
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value, href }: {
  icon: React.ElementType; label: string; value: string; href: string;
}) {
  return (
    <a href={href} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-farumasi-300 transition-colors block">
      <Icon className="w-5 h-5 text-farumasi-600" />
      <p className="text-xs text-slate-500 mt-2">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </a>
  );
}
