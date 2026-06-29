import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata = { title: "Privacy Policy · Farumasi" };

export default function PrivacyPage() {
  return <DynamicLegalPage slug="privacy" fallbackTitle="Privacy Policy" />;
}
