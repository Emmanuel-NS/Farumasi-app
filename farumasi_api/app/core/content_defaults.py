"""Default platform content pages — seeded when missing."""

from __future__ import annotations

from typing import Any

DEFAULT_CONTENT_PAGES: list[dict[str, Any]] = [
    {
        "slug": "terms",
        "page_type": "terms",
        "audience": "patient",
        "title": "Terms of Service",
        "summary": "Rules for using FARUMASI as a patient.",
        "body": """<h2>1. Acceptance</h2>
<p>By creating an account or using FARUMASI, you agree to these Terms and to our Privacy Policy.</p>
<h2>2. Healthcare disclaimer</h2>
<p>FARUMASI connects you to licensed pharmacies, pharmacists, and healthcare workers. It is not a substitute for professional medical advice, diagnosis, or treatment.</p>
<h2>3. Prescriptions</h2>
<p>Prescription medicine is dispensed only after review by a licensed pharmacist. We may decline orders that do not meet regulatory or safety requirements.</p>
<h2>4. Payments &amp; refunds</h2>
<p>Charges are made at checkout. Refunds for cancelled or undelivered orders are returned to the original payment method, typically within 7 business days.</p>
<h2>5. Acceptable use</h2>
<p>You agree not to misuse the platform — including attempting to obtain controlled substances fraudulently, reselling medicine, or interfering with the service.</p>
<h2>6. Termination</h2>
<p>You may close your account at any time from Settings → Data &amp; Privacy. We may suspend accounts that violate these Terms.</p>
<h2>7. Contact</h2>
<p>Questions? Email <a href="mailto:support@farumasi.com">support@farumasi.com</a>.</p>""",
        "contact_meta": {},
    },
    {
        "slug": "privacy",
        "page_type": "privacy",
        "audience": "patient",
        "title": "Privacy Policy",
        "summary": "How FARUMASI collects and protects your data.",
        "body": """<p>FARUMASI respects your privacy. We collect information needed to deliver medicines safely — including your name, contact details, delivery address, prescriptions, and relevant health information.</p>
<p>Data is encrypted in transit, shared only with healthcare professionals involved in your care, and never sold to advertisers. You can review, export, or delete your data from Settings → Data &amp; Privacy.</p>
<p>Contact <a href="mailto:support@farumasi.com">support@farumasi.com</a> for privacy requests.</p>""",
        "contact_meta": {},
    },
    {
        "slug": "about",
        "page_type": "about",
        "audience": "patient",
        "title": "About FARUMASI",
        "summary": "Our mission and how we serve patients in Rwanda.",
        "body": """<p>FARUMASI makes it simple to order medicines from verified pharmacies — with prescription review, delivery, and transparent pricing.</p>
<p>We work with licensed pharmacists and partners across Rwanda to keep you safe and informed.</p>""",
        "contact_meta": {},
    },
    {
        "slug": "support",
        "page_type": "support",
        "audience": "patient",
        "title": "Help & Support",
        "summary": "Get help with orders, prescriptions, and your account.",
        "body": "<p>We're here for you, every step of the way.</p>",
        "contact_meta": {
            "email": "support@farumasi.com",
            "phone": "+250 788 000 000",
            "whatsapp": "https://wa.me/250788000000",
            "faq": [
                {
                    "q": "How do I order medicine?",
                    "a": "Browse the Store, add items to your cart, then check out. We'll match you to the nearest verified pharmacy that has your items in stock.",
                },
                {
                    "q": "Can I upload a prescription?",
                    "a": "Yes. Go to Prescriptions → New, then upload a photo or PDF. A licensed pharmacist will review it before dispensing.",
                },
                {
                    "q": "How long does delivery take?",
                    "a": "Most Kigali deliveries arrive within 60 minutes. Out-of-Kigali timing depends on the pharmacy and rider availability.",
                },
                {
                    "q": "What payment methods are supported?",
                    "a": "MTN MoMo, MoMo pay code (manual proof), and debit/credit card via Pesapal.",
                },
            ],
        },
    },
]
