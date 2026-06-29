import { DynamicLegalPage } from "@/components/content/dynamic-legal-page";

export const metadata = {
  title: "Terms & Agreement · FARUMASI",
};

export default function PartnerTermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <DynamicLegalPage slug="terms" backHref="/register" fallbackTitle="Terms of Service" />
    </main>
  );
}
