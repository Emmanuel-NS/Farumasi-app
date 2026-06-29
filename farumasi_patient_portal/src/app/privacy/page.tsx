import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata = { title: "Privacy Policy · Farumasi" };

export default function PublicPrivacyPage() {
  return <DynamicLegalPage slug="privacy" backHref="/" fallbackTitle="Privacy Policy" />;
}
