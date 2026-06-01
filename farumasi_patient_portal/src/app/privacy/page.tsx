import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F9FAFB] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-farumasi-600 hover:underline font-medium">← Back</Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mt-1">Last updated: January 2025</p>
        </div>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">1. Introduction</h2>
            <p>
              Farumasi Ltd ("we", "our", "the Platform") is committed to protecting your personal
              information in accordance with Rwanda&apos;s Law No. 058/2021 of 13/10/2021 relating
              to the protection of personal data and privacy. This Privacy Policy explains what data
              we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> name, email address, phone number, date of birth.</li>
              <li><strong>Health data:</strong> order history, prescription uploads, health article interactions.</li>
              <li><strong>Location data:</strong> delivery address, optional real-time location for pharmacy finder.</li>
              <li><strong>Device data:</strong> IP address, browser type, and usage analytics (anonymised).</li>
              <li><strong>Payment data:</strong> transaction references only; card or Mobile Money numbers are processed by our payment providers and are not stored on Farumasi servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process your orders and facilitate delivery.</li>
              <li>To personalise health content and product recommendations.</li>
              <li>To send order status notifications and essential service communications.</li>
              <li>To comply with regulatory obligations including Rwanda FDA reporting.</li>
              <li>To improve the Platform through aggregated, anonymised analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">4. Sensitive Health Data</h2>
            <p>
              Health and prescription data is classified as sensitive personal data. It is encrypted
              at rest and in transit, access is restricted to authorised staff and partner pharmacies
              involved in fulfilling your order, and it is never sold or shared with third parties
              for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">5. Sharing Your Data</h2>
            <p>We may share your data with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Partner pharmacies</strong> — to fulfil your orders.</li>
              <li><strong>Payment processors</strong> — for transaction processing.</li>
              <li><strong>Delivery partners</strong> — for order logistics.</li>
              <li><strong>Regulators</strong> — where required by Rwandan law.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to advertisers or data brokers.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Order and
              prescription records are kept for a minimum of 5 years as required by Rwandan
              pharmaceutical regulations. You may request deletion of non-regulated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">7. Your Rights</h2>
            <p>Under Rwandan data protection law you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion of data not subject to a legal retention obligation.</li>
              <li>Withdraw consent for optional processing at any time.</li>
              <li>Lodge a complaint with the Rwanda National Cyber Security Authority (NCSA).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">8. Cookies and Analytics</h2>
            <p>
              The Platform uses essential cookies for authentication and session management.
              We use anonymised analytics to understand usage patterns. No cross-site tracking
              cookies are used. You may disable non-essential cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">9. Security</h2>
            <p>
              We employ industry-standard security measures including TLS encryption, role-based
              access controls, and regular security audits. No system can be guaranteed 100% secure;
              in the event of a data breach we will notify affected users within 72 hours where
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">10. Children</h2>
            <p>
              The Platform is not directed at children under 13. We do not knowingly collect
              personal data from children. If you believe your child has submitted data to us,
              contact us immediately and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-2">11. Contact</h2>
            <p>
              For privacy requests or complaints, contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@farumasi.com" className="text-farumasi-600 hover:underline">
                privacy@farumasi.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            See also our{" "}
            <Link href="/terms" className="text-farumasi-600 hover:underline font-medium">
              Terms and Conditions
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
