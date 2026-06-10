import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Privacy Policy Â· Farumasi" };

export default function PrivacyPage() {
  return (
    <article className="p-6 max-w-2xl mx-auto pb-24">
      <Link href="/settings" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-xs text-slate-500 mt-1">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none mt-6 space-y-5 text-slate-700">
        <section>
          <h2 className="text-base font-bold text-slate-900">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details: name, email, phone number, password (hashed).</li>
            <li>Health information you provide: prescriptions, order history, consultation messages.</li>
            <li>Device & usage data: IP address, app version, basic interaction events.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">How we use it</h2>
          <p>To fulfil your orders, connect you with pharmacists and riders, prevent fraud, comply with healthcare regulations, and improve the product.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">Who we share with</h2>
          <p>Only with parties needed to deliver the service: the dispensing pharmacy, the assigned rider, payment processors, and regulators when legally required.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">Your rights</h2>
          <p>You can export a copy of your data or request account deletion from Settings â†’ Data & Privacy. We retain records required by healthcare law even after deletion of your account.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">Security</h2>
          <p>Passwords are hashed with bcrypt. Transport uses HTTPS. We restrict internal access to staff with a legitimate need.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">Contact</h2>
          <p>Reach our data team at <a className="text-farumasi-600" href="mailto:privacy@farumasi.com">privacy@farumasi.com</a>.</p>
        </section>
      </div>
    </article>
  );
}
