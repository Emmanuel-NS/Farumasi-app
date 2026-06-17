import Link from "next/link";

export const metadata = {
  title: "Partner Terms & Agreement · FARUMASI",
};

export default function PartnerTermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
        <Link href="/register" className="text-sm text-farumasi-600 hover:underline font-medium">
          ← Back to application
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">FARUMASI Partner Agreement</h1>
        <p className="text-sm text-slate-500 mt-1">Last updated: June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance</h2>
            <p>
              By submitting a partner application or operating a seller account on FARUMASI, you agree
              to these Partner Terms, our platform policies, and applicable Rwandan pharmaceutical and
              commercial regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Eligibility & licensing</h2>
            <p>
              You represent that your business holds a valid operating license or approval from RFDA or
              another competent authority. You must upload accurate license details and keep them current.
              FARUMASI may suspend or reject applications that cannot be verified.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Platform commission</h2>
            <p>
              FARUMASI charges a platform commission on product subtotals for orders fulfilled through
              the marketplace. The default rate is <strong>10%</strong> unless a different rate is
              agreed in writing and confirmed by both parties in the Requests workflow. Commission is
              deducted before net earnings are credited to your wallet.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Listings, pricing & fulfillment</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for accurate product listings, stock levels, and pricing.</li>
              <li>Prescription orders must be reviewed according to applicable pharmacy law.</li>
              <li>You must maintain the business location coordinates provided during onboarding.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Payouts</h2>
            <p>
              Withdrawals are paid to the payout account you register. Changes to payout details may
              require email verification. FARUMASI is not liable for failed payouts caused by incorrect
              account information you provide.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Data & confidentiality</h2>
            <p>
              Patient and order data shared with you must be used only to fulfill FARUMASI orders and
              consultations. You must not resell, publish, or misuse personal or health information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Suspension & termination</h2>
            <p>
              FARUMASI may suspend or terminate partner accounts for regulatory non-compliance,
              fraudulent listings, repeated order failures, or breach of these terms. You may stop using
              the platform at any time subject to settlement of outstanding orders and withdrawals.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">8. Contact</h2>
            <p>
              Partner support:{" "}
              <a className="text-farumasi-600 font-medium" href="mailto:partners@farumasi.com">
                partners@farumasi.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
