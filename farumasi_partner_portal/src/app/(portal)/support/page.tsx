"use client";

import { useState } from "react";
import { HelpCircle, MessageSquare, BookOpen, Mail, ExternalLink, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "How do I request a new product to be added?", a: "Open Requests in the sidebar, stay on the Submitted tab, and click 'New product request'. Our team reviews submissions within 3–5 business days." },
  { q: "Where do I approve commission or agreement changes?", a: "FARUMASI sends those to Requests → Inbox. Confirm or decline there before changes apply to your account." },
  { q: "When are withdrawal funds disbursed?", a: "Submit a request from Revenue & Wallet. FARUMASI reviews it, then pays you manually to your registered payout account (bank or mobile money). Your balance updates once the payout is marked paid — usually within 1–2 business days after approval." },
  { q: "How do I register or change my payout account?", a: "You register bank or MoMo details during partner signup. All withdrawals go only to that account. To change it later, open Business Profile → Registered payout account, request an email verification code on your owner login, and confirm the new details with the code." },
  { q: "How is the commission calculated?", a: "FARUMASI deducts your agreed commission rate once from each order's product revenue (subtotal). What remains is your net earning — withdrawals come from that net balance with no extra commission or fees." },
  { q: "What documents are required for compliance?", a: "You need a valid Business Registration Certificate, Tax Clearance Certificate, Pharmacy Operating License, and RFDA Dispensing License." },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const handleTicket = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in Subject and Message");
      return;
    }
    const body = encodeURIComponent(
      `Category: ${category || "General"}\n\n${message.trim()}`,
    );
    const mailSubject = encodeURIComponent(`[Partner Portal] ${subject.trim()}`);
    window.location.href = `mailto:partners@farumasi.rw?subject=${mailSubject}&body=${body}`;
    toast.info("Opening your email client — support tickets are handled by email until in-app ticketing is live.");
  };

  const handleContact = (type: string) => {
    if (type === "Documentation") {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const subject = encodeURIComponent(type === "Live Chat" ? "[Partner Portal] Live support request" : "[Partner Portal] Support");
    window.location.href = `mailto:partners@farumasi.rw?subject=${subject}`;
  };
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Help & Support" description="Get help, read documentation, or contact the FARUMASI team" icon={HelpCircle} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { icon: BookOpen, title: "Documentation", description: "Guides and tutorials for all portal features", action: "Browse Docs" },
          { icon: MessageSquare, title: "Live Chat", description: "Chat with our support team (Mon–Fri, 8am–6pm CAT)", action: "Start Chat" },
          { icon: Mail, title: "Email Support", description: "partners@farumasi.rw · Response within 24 hours", action: "Send Email" },
        ].map(card => (
          <Card key={card.title} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => handleContact(card.title)}>
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-farumasi-100 flex items-center justify-center mb-3">
                <card.icon className="w-5 h-5 text-farumasi-700" />
              </div>
              <CardTitle className="text-sm mb-1">{card.title}</CardTitle>
              <CardDescription className="text-xs">{card.description}</CardDescription>
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-farumasi-600 -ml-2 gap-1">
                {card.action} <ExternalLink className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card id="faq">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b last:border-0">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <p className="text-sm font-semibold text-foreground">{faq.q}</p>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", openFaq === i && "rotate-180")} />
              </button>
              {openFaq === i && (
                <p className="text-xs text-muted-foreground px-5 pb-4 leading-relaxed">{faq.a}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Submit a Ticket</CardTitle>
          <CardDescription>Describe your issue and we'll get back to you within 24 hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input placeholder="e.g. Orders, Payments, Products…" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea placeholder="Describe your issue in detail…" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <p className="text-[11px] text-muted-foreground">
              Opens your email client — messages are not stored in the portal until ticketing is integrated.
            </p>
            <Button size="sm" className="text-xs" onClick={handleTicket}>Email Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
