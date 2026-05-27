import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Terms of Service · Farumasi" };

export default function TermsPage() {
  return (
    <article className="p-6 max-w-2xl mx-auto pb-24">
      <Link href="/settings" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
      <p className="text-xs text-slate-500 mt-1">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none mt-6 space-y-5 text-slate-700">
        <section>
          <h2 className="text-base font-bold text-slate-900">1. Acceptance</h2>
          <p>By creating an account or using Farumasi, you agree to these Terms and to our Privacy Policy.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">2. Healthcare disclaimer</h2>
          <p>Farumasi connects you to licensed pharmacies, pharmacists, and healthcare workers. It is not a substitute for professional medical advice, diagnosis, or treatment.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">3. Prescriptions</h2>
          <p>Prescription medicine is dispensed only after review by a licensed pharmacist. We may decline orders that do not meet regulatory or safety requirements.</p>
        </section>
        <section className="not-prose rounded-2xl border border-farumasi-200 bg-farumasi-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center shrink-0 text-farumasi-700 font-bold">i</div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-farumasi-900">A note on your personal data</h2>
              <p className="text-sm text-farumasi-900/90 mt-1 leading-relaxed">
                To serve you safely, Farumasi needs to collect and share certain personal information with the licensed pharmacists, doctors, and riders who fulfill your request. By using the app, <strong>you agree to provide details such as your full name, contact information, delivery address, prescriptions, medications, allergies, and relevant health information</strong> whenever they are needed to process an order or consultation.
              </p>
              <p className="text-sm text-farumasi-900/90 mt-2 leading-relaxed">
                We treat this information as strictly confidential. It is encrypted in transit, accessible only to the healthcare professionals directly involved in your care, and never sold to advertisers. You can review, export, or delete your data at any time from <Link href="/settings" className="font-semibold underline">Settings → Data &amp; Privacy</Link>.
              </p>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">4. Payments & refunds</h2>
          <p>Charges are made at checkout. Refunds for cancelled or undelivered orders are returned to the original payment method, typically within 7 business days.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">5. Acceptable use</h2>
          <p>You agree not to misuse the platform — including attempting to obtain controlled substances fraudulently, reselling medicine, or interfering with the service.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">6. Termination</h2>
          <p>You may close your account at any time from Settings → Data & Privacy. We may suspend accounts that violate these Terms.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-slate-900">7. Contact</h2>
          <p>Questions? Email <a className="text-farumasi-600" href="mailto:support@farumasi.com">support@farumasi.com</a>.</p>
        </section>
      </div>
    </article>
  );
}
