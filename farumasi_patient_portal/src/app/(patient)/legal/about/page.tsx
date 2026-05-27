import Link from "next/link";
import { ChevronLeft, Heart, MapPin, Shield } from "lucide-react";

export const metadata = { title: "About Farumasi · Farumasi" };

export default function AboutPage() {
  return (
    <article className="p-6 max-w-2xl mx-auto pb-24">
      <Link href="/settings" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">About Farumasi</h1>
      <p className="text-sm text-slate-500 mt-1">A trusted pharmacy & healthcare coordination platform.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card icon={Heart}  title="Our mission" body="Make medicine and qualified pharmacist advice accessible to every household." />
        <Card icon={MapPin} title="Where we work" body="Currently serving Rwanda, with plans to expand across East Africa." />
        <Card icon={Shield} title="How we protect you" body="Licensed partners, encrypted communications, and pharmacist review on every prescription." />
      </div>

      <section className="mt-8 space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          Farumasi was built to remove the friction between people and the medicine they need. We
          partner with verified pharmacies, employ licensed pharmacists for clinical review, and
          coordinate riders to get medicine to your door — often within an hour.
        </p>
        <p>
          We&apos;re a small team based in Kigali. If you have feedback, an idea, or a hard day at
          the pharmacy you wish we&apos;d fix — write to us at{" "}
          <a className="text-farumasi-600 font-semibold" href="mailto:hello@farumasi.com">hello@farumasi.com</a>.
        </p>
      </section>

      <p className="text-xs text-slate-400 mt-10">App version 1.0.0 · © {new Date().getFullYear()} Farumasi</p>
    </article>
  );
}

function Card({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <Icon className="w-5 h-5 text-farumasi-600" />
      <p className="text-sm font-bold text-slate-900 mt-2">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
