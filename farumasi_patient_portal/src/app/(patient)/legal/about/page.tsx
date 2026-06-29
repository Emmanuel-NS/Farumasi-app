import { DynamicLegalPage } from "@/components/legal/dynamic-legal-page";

export const metadata = { title: "About · Farumasi" };

export default function AboutPage() {
  return <DynamicLegalPage slug="about" fallbackTitle="About FARUMASI" />;
}
