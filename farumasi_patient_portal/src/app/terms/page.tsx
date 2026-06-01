import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-farumasi-600 hover:underline font-medium">← Back</Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Terms and Conditions</h1>
          <p className="text-slate-500 text-sm mt-1">Last updated: January 2025</p>
        </div>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">1. About Farumasi</h2>
            <p>
              Farumasi (hereinafter "the Platform") is a digital health and pharmaceutical marketplace
              operated in Rwanda. It connects patients with licensed partner pharmacies and verified
              health information. By creating an account or browsing the Platform, you agree to these
              Terms and Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">2. Eligibility</h2>
            <p>
              You must be at least 18 years of age to create an account and place orders. Users under
              18 may browse the Platform in guest mode. By registering, you confirm that the
              information you provide is accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">3. Medical Disclaimer</h2>
            <p>
              Content on Farumasi — including health articles, product descriptions, and dosage
              information — is provided for informational purposes only and does not constitute
              medical advice. Always consult a qualified healthcare professional before starting,
              stopping, or changing any treatment. Farumasi is not liable for any health outcomes
              resulting from reliance on information published on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">4. Orders and Prescriptions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prescription medicines may only be dispensed upon presentation of a valid prescription issued by a licensed Rwandan healthcare provider.</li>
              <li>Farumasi reserves the right to cancel any order where a prescription cannot be verified.</li>
              <li>Prices displayed are indicative and may vary by pharmacy. Final prices are confirmed at checkout.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">5. Delivery and Pick-up</h2>
            <p>
              Delivery timelines are estimates provided by partner pharmacies and are not guaranteed
              by Farumasi. Once an order has been dispatched, responsibility for timely delivery
              lies with the partner pharmacy. In the event of a non-delivery, contact our support
              team within 48 hours of the expected delivery date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">6. Payments and Refunds</h2>
            <p>
              Farumasi supports Mobile Money (MTN, Airtel), card payments, and other local methods.
              Refunds are processed within 5–10 business days for eligible returns. Medicines that
              have been opened or that require a cold chain cannot be returned unless they were
              delivered in a defective or incorrect state.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">7. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Platform to purchase controlled substances without a valid prescription.</li>
              <li>Misrepresent your identity or medical credentials.</li>
              <li>Reverse-engineer, scrape, or otherwise interfere with the Platform.</li>
              <li>Post false, misleading, or harmful reviews or comments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">8. Intellectual Property</h2>
            <p>
              All content, branding, and software on the Farumasi Platform are the property of
              Farumasi Ltd or its licensors and are protected under Rwandan copyright and
              intellectual property laws. Unauthorised reproduction is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Farumasi shall not be liable for indirect,
              incidental, or consequential damages arising from your use of the Platform, including
              but not limited to loss of data, health complications, or financial loss.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Rwanda. Any disputes shall
              be resolved through the competent courts of Rwanda.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">11. Changes to These Terms</h2>
            <p>
              Farumasi may update these Terms at any time. Continued use of the Platform after
              changes are published constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@farumasi.com" className="text-farumasi-600 hover:underline">
                support@farumasi.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            See also our{" "}
            <Link href="/privacy" className="text-farumasi-600 hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
