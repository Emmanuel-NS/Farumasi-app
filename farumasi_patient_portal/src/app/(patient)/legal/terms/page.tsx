import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata = { title: "Terms of Service · Farumasi" };

export default function TermsPage() {
  return <DynamicLegalPage slug="terms" fallbackTitle="Terms of Service" />;
}
