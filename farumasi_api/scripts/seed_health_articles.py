"""
Comprehensive Health Articles Seeder for Farumasi.

Seeds the `health_articles` table with a well-organised, clinically-grounded
library of articles spanning prevention, chronic disease, medication safety,
women's & child health, mental health, nutrition, first aid and more.

Run from the `farumasi_api` directory:

    python scripts/seed_health_articles.py

Articles are idempotent: existing rows (matched by `slug`) are skipped.
Author defaults to the demo pharmacist (pharmacist@farumasi.com) when present.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone

# Make `app` importable when running this file directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Import the models package so all mappers are registered before queries run.
import app.models  # noqa: F401
from app.core.config import settings
from app.core.constants import ArticleStatus
from app.models.article import HealthArticle
from app.models.pharmacist import PharmacistProfile
from app.models.user import User


# ---------------------------------------------------------------------------
# Article library
# ---------------------------------------------------------------------------
# Each entry must include: title, slug, summary, content, category, image_url.
# Content uses lightweight markdown so the patient portal can render headings,
# lists and emphasis. Keep clinical claims conservative and Rwanda-aware.

ARTICLES: list[dict] = [
    # ---------------- Infectious Diseases ----------------
    {
        "title": "Malaria Prevention in Rwanda: A Complete Guide",
        "slug": "malaria-prevention-rwanda-complete-guide",
        "category": "Infectious Diseases",
        "summary": (
            "Practical, evidence-based steps to prevent malaria at home and when "
            "travelling to high-transmission districts in Rwanda."
        ),
        "image_url": "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=1200&q=80",
        "content": """
## Why malaria still matters

Despite Rwanda's strong national malaria programme, transmission persists in
several districts especially in the Eastern Province and lowland areas of the
Southern Province. Children under 5 and pregnant women remain the most
vulnerable groups.

## Daily prevention at home

- **Sleep under a long-lasting insecticidal net (LLIN)** every night — the
  whole family, every age group.
- **Close windows and doors at dusk** and use screens where possible.
- **Empty stagnant water** weekly from buckets, tyres, gutters and flowerpots.
- **Indoor residual spraying** when offered by your district health team.

## Recognising the symptoms early

Suspect malaria if you have **fever, chills, headache, joint pain, vomiting
or extreme tiredness** within 7–30 days of a mosquito exposure. In children,
watch for poor feeding, irritability and rapid breathing.

> Do not wait. Untreated *Plasmodium falciparum* malaria can become severe
> within 24 hours.

## What to do if you suspect malaria

1. Go to the nearest health centre for a **rapid diagnostic test (RDT)**.
2. If positive, complete the **full course** of artemisinin-based combination
   therapy (ACT) — usually artemether-lumefantrine for 3 days.
3. Drink plenty of fluids and use paracetamol for fever.
4. Return immediately if symptoms worsen, vomiting prevents you from keeping
   tablets down, or you become confused.

## Special precautions

- **Pregnant women**: attend all ANC visits — intermittent preventive
  treatment (IPTp) protects both mother and baby.
- **Travellers from low-risk areas**: carry repellent containing DEET or
  picaridin and consider chemoprophylaxis after speaking to a pharmacist.

## Get help on Farumasi

Order LLINs, repellents and ACT refills from a verified pharmacy on Farumasi
and have them delivered the same day in Kigali.
""",
    },
    {
        "title": "Typhoid Fever: Causes, Symptoms and Safe Treatment",
        "slug": "typhoid-fever-causes-symptoms-safe-treatment",
        "category": "Infectious Diseases",
        "summary": (
            "Typhoid spreads through contaminated food and water. Learn how to "
            "prevent it and what a proper course of treatment looks like."
        ),
        "image_url": "https://images.unsplash.com/photo-1559757175-08f0e3b03d6e?w=1200&q=80",
        "content": """
## What is typhoid fever?

Typhoid is caused by *Salmonella enterica* serotype Typhi, a bacterium spread
through food and water contaminated with infected human waste. It remains
common in parts of East Africa where sanitation is limited.

## Symptoms develop gradually

- **Sustained high fever** (often rising step-wise over several days)
- Headache, abdominal pain, weakness
- Loss of appetite, constipation **or** diarrhoea
- A faint rose-coloured rash on the trunk in some cases

## Confirming the diagnosis

Self-medicating based on symptoms alone is a major cause of antibiotic
resistance in Rwanda. Always confirm with a **blood culture** (gold standard)
or, where unavailable, a Widal test interpreted by a clinician.

## Treatment: complete the full course

Common first-line antibiotics include **azithromycin, ciprofloxacin or
ceftriaxone**, chosen based on local resistance patterns. Whichever is
prescribed:

- Take every dose at the scheduled time.
- **Do not stop early** even if you feel better after 2–3 days.
- Avoid sharing antibiotics with family members.

## Prevention is simple but powerful

- Drink **treated, boiled or bottled water**.
- Wash hands with soap before cooking and after the toilet.
- Wash fruits and vegetables, and avoid raw foods of uncertain origin.
- Ask your pharmacist about the **Vi typhoid vaccine** if you travel
  frequently or work in food handling.

## When to seek emergency care

Severe abdominal pain, blood in stool, confusion or persistent vomiting can
signal intestinal perforation — a surgical emergency. Go to a hospital
immediately.
""",
    },
    {
        "title": "Living Well with HIV: Adherence, Nutrition and Mental Health",
        "slug": "living-well-with-hiv-adherence-nutrition-mental-health",
        "category": "Infectious Diseases",
        "summary": (
            "Modern antiretroviral therapy lets people with HIV live long, "
            "healthy lives. Here's how to make adherence simple and sustainable."
        ),
        "image_url": "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=1200&q=80",
        "content": """
## ART works — when taken consistently

Modern antiretroviral therapy (ART) suppresses the virus to undetectable
levels in most people. **Undetectable = Untransmittable (U=U)**: when your
viral load is undetectable, you cannot pass HIV to a sexual partner.

## Making daily ART easy

- **Pick a fixed time** linked to a daily habit (brushing teeth, the 7am news).
- Use a **weekly pill organiser** or your phone alarm.
- Keep a **3-day reserve supply** for travel or unexpected delays.
- Order refills early on Farumasi to avoid gaps.

## Side effects: what's normal

Mild nausea, headaches or vivid dreams often settle within 2–4 weeks. Speak
to your clinician — never your neighbour — about:

- Persistent vomiting
- Yellowing of eyes or skin
- Numbness or tingling in feet
- New rash

## Nutrition supports immunity

Aim for balanced meals rich in protein (beans, eggs, fish, meat), vegetables
and whole grains. Folate, B12, iron and zinc are especially important. Avoid
alcohol while taking ART when possible.

## Mental health matters

Depression and anxiety are common — and treatable. Speak to your counsellor
at the health centre. Peer support groups (RNGOF, others) reduce stigma and
improve adherence.

## Routine monitoring

Attend every appointment for:

- Viral load (typically every 6–12 months once stable)
- CD4 count when indicated
- Screening for TB, hepatitis and cervical cancer

Living with HIV today is about thriving, not just surviving.
""",
    },

    # ---------------- Chronic Disease ----------------
    {
        "title": "Type 2 Diabetes: Eating, Moving and Medicating Well",
        "slug": "type-2-diabetes-eating-moving-medicating-well",
        "category": "Chronic Disease",
        "summary": (
            "A practical, Rwanda-centred guide to controlling blood sugar with "
            "food, activity and the right medication."
        ),
        "image_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80",
        "content": """
## Understanding type 2 diabetes

In type 2 diabetes the body either does not produce enough insulin or cannot
use it well. Over time high blood sugar damages the heart, kidneys, eyes and
nerves — but good control prevents most complications.

## Eat for steady blood sugar

- Fill half your plate with **vegetables** (dodo, isombe, cabbage, carrots).
- Choose **whole grains** — sorghum, brown rice, ubugali made from less
  refined cassava flour.
- Pair carbohydrates with **protein** (beans, fish, eggs) to slow absorption.
- Limit sugary drinks, white bread, doughnuts and fruit juice.
- Eat fresh fruit whole rather than juiced; favour avocado, papaya and guava.

## Move every day

Aim for **30 minutes of brisk walking** five days a week, plus simple
strength exercises twice weekly. Even Umuganda activities count.

## Medication basics

The most common first-line tablet is **metformin**. Take it with food to
reduce stomach upset, and stay well hydrated.

If your doctor prescribes additional medication (gliclazide, DPP-4
inhibitors, insulin), ask:

1. When exactly should I take it?
2. What are the signs of low blood sugar?
3. What should I do if I miss a dose?

## Recognise hypoglycaemia

Symptoms: shakiness, sweating, hunger, confusion, fast heartbeat.
**Treat immediately** with 3 glucose tablets, ½ glass of fruit juice or
1 tablespoon of sugar in water. Recheck after 15 minutes.

## Monitoring

- Home blood glucose monitoring if recommended.
- **HbA1c every 3–6 months** — aim for the target your clinician sets
  (often <7%).
- Annual eye, kidney and foot examination.

## Foot care saves limbs

Inspect feet daily, wash and dry between toes, never walk barefoot. See a
pharmacist or nurse early for any cut, blister or colour change.
""",
    },
    {
        "title": "Chronic Kidney Disease: Protecting Your Kidneys Early",
        "slug": "chronic-kidney-disease-protecting-kidneys-early",
        "category": "Chronic Disease",
        "summary": (
            "Most kidney disease is silent until late. Learn the early warning "
            "signs, the lab tests that matter and lifestyle changes that help."
        ),
        "image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80",
        "content": """
## Who is at risk?

The two biggest causes of chronic kidney disease (CKD) in Rwanda are
**uncontrolled diabetes** and **uncontrolled hypertension**. Other risks
include long-term use of certain painkillers, recurrent kidney infections,
HIV and a family history of kidney disease.

## Early signs are subtle

- Foamy urine (protein leak)
- Swelling around the eyes, ankles or feet
- Tiredness, poor appetite, itching
- Needing to pass urine at night more often

## Tests your clinician may order

- **Serum creatinine** with eGFR calculation
- **Urine albumin-to-creatinine ratio (uACR)**
- Blood pressure, blood sugar and lipids
- Kidney ultrasound when indicated

## Lifestyle that protects kidneys

- Control **blood pressure** (<130/80 for most adults with CKD).
- Control **blood sugar** if diabetic.
- Reduce **salt** to less than a teaspoon a day; avoid bouillon cubes when
  possible.
- Drink water based on thirst — neither too little nor excessive.
- Avoid **NSAIDs** (ibuprofen, diclofenac) for routine pain unless your
  clinician approves; prefer paracetamol.

## Medications that protect kidneys

ACE inhibitors (e.g. enalapril) or ARBs (e.g. losartan) slow CKD
progression. **Never stop them without medical advice**, even if your blood
pressure looks normal.

## When dialysis is mentioned

Late-stage CKD may need dialysis or transplant. Acting early at stages 1–3
means most people never reach that point.
""",
    },

    # ---------------- Cardiovascular ----------------
    {
        "title": "Hypertension: The Silent Killer You Can Beat",
        "slug": "hypertension-silent-killer-you-can-beat",
        "category": "Cardiovascular",
        "summary": (
            "One in four Rwandan adults has high blood pressure. Most do not "
            "know it. Here's how to find out and what to do next."
        ),
        "image_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80",
        "content": """
## Why blood pressure matters

Hypertension is the leading risk factor for stroke, heart attack and kidney
failure. It rarely causes symptoms — the only way to detect it is to measure.

## Know your numbers

| Category | Systolic | Diastolic |
|----------|----------|-----------|
| Normal | <120 | <80 |
| Elevated | 120–129 | <80 |
| Stage 1 hypertension | 130–139 | 80–89 |
| Stage 2 hypertension | ≥140 | ≥90 |

Check your blood pressure at least once a year — more often if you have
risk factors or are over 40.

## Lifestyle first

- **Salt**: less than 5 g (one teaspoon) per day. Beware bouillon cubes,
  soy sauce and processed snacks.
- **Diet**: more vegetables, fruit, beans, whole grains, less red meat.
- **Activity**: 150 minutes of moderate exercise weekly.
- **Weight**: even 5 kg loss can drop systolic pressure by 5 mmHg.
- **Alcohol**: no more than 1–2 standard drinks per day.
- **Tobacco**: stop completely — every cigarette spikes blood pressure.

## When medication is needed

If lifestyle alone is not enough, your clinician may prescribe:

- **Amlodipine** (calcium channel blocker)
- **Hydrochlorothiazide** (diuretic)
- **Enalapril or losartan** (kidney protective)

> Take the medication every day, even when you feel fine. Hypertension is
> usually a lifelong condition.

## Home monitoring

A validated upper-arm cuff is best. Sit quietly for 5 minutes, feet flat on
the floor, take two readings 1 minute apart, morning and evening for a week.

## Emergency signs

Sudden severe headache, chest pain, weakness on one side, confusion or
trouble speaking — go to hospital immediately.
""",
    },
    {
        "title": "Heart Health and Cholesterol: Simple Rules That Work",
        "slug": "heart-health-cholesterol-simple-rules-that-work",
        "category": "Cardiovascular",
        "summary": (
            "Cholesterol is not just a Western problem. Understand the numbers "
            "and the foods that protect your heart."
        ),
        "image_url": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&q=80",
        "content": """
## The cholesterol story

Cholesterol is a fat carried in the blood. Two main types matter:

- **LDL ("bad")** — builds up in artery walls.
- **HDL ("good")** — clears LDL from circulation.

A high LDL combined with low HDL increases the risk of heart attack and
stroke.

## When to check

- Adults over 40
- Anyone with diabetes, hypertension or family history of early heart disease
- Anyone with central obesity (waist >94 cm men / >80 cm women)

A fasting lipid panel gives total cholesterol, LDL, HDL and triglycerides.

## Eat to protect your arteries

- **Replace** palm oil and animal fats with sunflower, avocado or olive oil.
- Eat **fish** (tilapia, sambaza) at least twice a week.
- Choose **legumes** (beans, peas, lentils) several times a week.
- Snack on **fruits and roasted groundnuts** rather than fried foods.
- Limit chapati, mandazi, sambusa and other deep-fried staples.

## Move more

Walking briskly for 30 minutes daily raises HDL and lowers triglycerides.
Cycling and dancing count.

## Medication when needed

Statins (e.g. atorvastatin, simvastatin) significantly lower heart attack
and stroke risk in high-risk people. Take them in the evening unless told
otherwise, and report unexplained muscle pain.
""",
    },

    # ---------------- Respiratory ----------------
    {
        "title": "Asthma Management: Breathe Easier Every Day",
        "slug": "asthma-management-breathe-easier-every-day",
        "category": "Respiratory",
        "summary": (
            "Asthma is controllable. Learn the difference between reliever and "
            "preventer inhalers, and how to spot an attack early."
        ),
        "image_url": "https://images.unsplash.com/photo-1631815587646-b8501f7eb1a0?w=1200&q=80",
        "content": """
## Two types of inhalers — know the difference

- **Reliever (usually blue)**: salbutamol. Used **only when needed** to
  open airways during symptoms.
- **Preventer (usually brown or orange)**: an inhaled corticosteroid such
  as beclomethasone or budesonide. Used **every day** to reduce airway
  inflammation.

> Using the reliever more than twice a week usually means your asthma is
> not well controlled — speak to your clinician.

## Inhaler technique that actually works

1. Shake the inhaler well.
2. Breathe out fully.
3. Place the mouthpiece between your teeth and seal your lips.
4. Press the inhaler as you start a **slow, deep breath in**.
5. Hold your breath for 10 seconds.
6. Rinse your mouth after using a steroid inhaler.

A spacer device improves delivery, especially in children.

## Common triggers in Rwanda

- Dust during the dry season
- Wood and charcoal smoke
- Pollen, mould, cockroaches
- Respiratory infections
- Cold air and exercise

## Action plan

- **Green zone** (no symptoms): take your preventer daily.
- **Yellow zone** (cough, wheeze, night waking): take 4–8 puffs of reliever,
  start any rescue steroid your doctor has prescribed, and call your
  pharmacist or clinician.
- **Red zone** (severe shortness of breath, cannot speak full sentences,
  blue lips): take 8 puffs of reliever via spacer and go to hospital
  immediately.

## When to see a clinician

- Symptoms more than twice a week
- Night waking more than twice a month
- Reliever use increasing
- After any A&E visit for asthma
""",
    },
    {
        "title": "Tuberculosis: Curable, Preventable, Beatable",
        "slug": "tuberculosis-curable-preventable-beatable",
        "category": "Respiratory",
        "summary": (
            "TB is fully treatable with the right medication taken for the "
            "right duration. Stigma kills more than the disease itself."
        ),
        "image_url": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80",
        "content": """
## Recognising TB

Suspect TB if you have a **cough lasting more than two weeks**, especially
with:

- Night sweats
- Unintentional weight loss
- Low-grade fever
- Coughing up blood

## Free diagnosis and treatment

Sputum testing (GeneXpert) is available at health centres across Rwanda.
Treatment under the Directly Observed Therapy Short-course (DOTS) programme
is **free** and lasts at least 6 months.

## Standard treatment

The first 2 months use four drugs (HRZE: isoniazid, rifampicin,
pyrazinamide, ethambutol), followed by 4 months of isoniazid + rifampicin.

> **Adherence is everything.** Stopping early creates drug-resistant TB
> which is far harder to treat.

## Side effects to mention to your clinician

- Yellowing of the eyes
- Numbness in the feet
- Visual changes
- Severe nausea or rash

Vitamin B6 (pyridoxine) is usually given with isoniazid to prevent nerve
side effects.

## Protect your household

- Cover coughs and sneezes.
- Sleep in a well-ventilated room while infectious.
- Encourage household contacts — especially children under 5 and people
  with HIV — to be screened.

## Living a normal life after TB

After successful treatment most people return to full health. Continued
nutritious meals, smoking cessation and HIV testing complete the picture.
""",
    },

    # ---------------- Medication Safety ----------------
    {
        "title": "Antibiotic Resistance: Use Them Right or Lose Them",
        "slug": "antibiotic-resistance-use-them-right-or-lose-them",
        "category": "Medication Safety",
        "summary": (
            "Antibiotics save lives — but misuse is making them stop working. "
            "Here's how to use them responsibly."
        ),
        "image_url": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=80",
        "content": """
## What antibiotics can and cannot do

Antibiotics work **only against bacteria**. They do **nothing** against
viruses such as flu, the common cold or COVID-19. Taking them when not
needed kills helpful bacteria and breeds resistant ones.

## Seven golden rules

1. **Only take antibiotics prescribed for you** — never share or use
   leftovers.
2. **Complete the full course**, even if you feel better.
3. **Take doses on time** — every 8 or 12 hours as advised.
4. **Do not skip doses** to "save" tablets.
5. **Tell your pharmacist** about allergies and other medications.
6. **Do not pressure your clinician** for antibiotics if they say you don't
   need them.
7. **Return unused antibiotics** to a pharmacy for safe disposal.

## Common interactions to know

- **Amoxicillin**: usually fine with food.
- **Doxycycline**: take with a full glass of water, sit upright for 30
  minutes; avoid dairy and antacids within 2 hours.
- **Ciprofloxacin**: avoid dairy and iron supplements close to the dose;
  may interact with caffeine.
- **Metronidazole**: **no alcohol** during and for 48 hours after — risk of
  severe nausea and vomiting.

## Watch for serious reactions

Severe rash, swelling of face or throat, difficulty breathing, or
yellowing of eyes — stop the medicine and go to hospital immediately.

## A note for parents

Most childhood coughs and runny noses are viral. Push for plenty of fluids,
paracetamol for fever, and follow up if symptoms last more than 3 days.
""",
    },
    {
        "title": "Paracetamol Safety: The Right Dose Matters",
        "slug": "paracetamol-safety-the-right-dose-matters",
        "category": "Medication Safety",
        "summary": (
            "Paracetamol is the safest painkiller for most people — but only "
            "when dosed correctly. Overdose silently damages the liver."
        ),
        "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80",
        "content": """
## Adult dosing

- **500–1000 mg every 4–6 hours** as needed.
- **Maximum 4 g (4000 mg) in 24 hours** — that is 8 tablets of 500 mg.
- Reduce the maximum to 3 g/day if you weigh under 50 kg, drink alcohol
  daily or have liver disease.

## Children — always weight-based

- **15 mg/kg per dose, every 4–6 hours.**
- Maximum **60 mg/kg per day** and never more than 4 doses in 24 hours.
- Use a proper oral syringe — household spoons are not accurate.

## Hidden in other products

Many cold-and-flu remedies (Coldrex, Panadol Cold & Flu) already contain
paracetamol. Always check the label before adding another paracetamol
tablet — overdose is easy and silent.

## Signs of overdose

The dangerous part of paracetamol overdose is that symptoms are mild for
24–48 hours, then liver failure appears. Suspect overdose with:

- Nausea and vomiting in the first day
- Upper right belly pain on day 2–3
- Yellowing of eyes or confusion later

**Always go to hospital quickly** — there is an antidote (N-acetylcysteine)
that works best when given within 8 hours.

## When paracetamol is not enough

For dental, period or musculoskeletal pain, your pharmacist may suggest
adding ibuprofen for a short period if you have no kidney, stomach or
heart contraindications.
""",
    },

    # ---------------- Women's Health ----------------
    {
        "title": "Prenatal Care: A Healthy Start for Mum and Baby",
        "slug": "prenatal-care-healthy-start-for-mum-and-baby",
        "category": "Women's Health",
        "summary": (
            "From folic acid to delivery planning — what every pregnant woman "
            "in Rwanda should know."
        ),
        "image_url": "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=1200&q=80",
        "content": """
## Start care early

Visit your health centre as soon as you suspect pregnancy. Rwanda's policy
is **at least 8 antenatal care (ANC) contacts**, beginning before 12 weeks.

## Essential supplements

- **Folic acid 400 µg daily**, ideally starting 3 months before conception
  and continuing through the first trimester. It prevents serious spinal
  defects in the baby.
- **Iron + folic acid combination** through pregnancy to prevent anaemia.
- **Calcium 1.5–2 g/day** if dietary intake is low.

## Eat well, gain steadily

Aim for an extra small snack daily in the first trimester, then about 300
extra calories per day later. Focus on:

- Beans, eggs, fish, milk for protein
- Dark green leaves (isombe, dodo) for iron and folate
- Fruits and orange-fleshed sweet potato for vitamins
- Whole grains for energy

## Avoid

- Alcohol and tobacco completely
- Raw or undercooked meat, fish and eggs
- Unpasteurised dairy
- Self-medication — always ask a pharmacist first

## Danger signs — go to hospital immediately

- Vaginal bleeding
- Severe headache, blurred vision, swelling of face/hands (possible
  pre-eclampsia)
- Reduced or absent baby movements after 28 weeks
- Severe abdominal pain
- Fever above 38°C
- Watery vaginal discharge before 37 weeks

## Birth preparedness

Discuss with your clinician where you will deliver, who will accompany you,
and how you will get there at any hour. Pack a delivery bag from 36 weeks.
""",
    },
    {
        "title": "Family Planning in Rwanda: Choosing What's Right for You",
        "slug": "family-planning-rwanda-choosing-whats-right-for-you",
        "category": "Women's Health",
        "summary": (
            "Modern contraception is safe, effective and available. Compare "
            "the main options in plain language."
        ),
        "image_url": "https://images.unsplash.com/photo-1559059699-085698eba48c?w=1200&q=80",
        "content": """
## Why family planning matters

Spacing pregnancies by at least 2 years reduces maternal and child deaths,
allows women to continue education and gives families economic stability.

## Long-acting reversible methods (most effective)

- **Implants (Jadelle, Implanon NXT)** — small rods placed under the upper
  arm; effective for 3–5 years.
- **IUD (copper or hormonal)** — effective for 5–10 years.

Both are reversible — fertility returns quickly after removal.

## Hormonal methods

- **Combined oral contraceptive pill** — taken daily; avoid if you have
  uncontrolled hypertension, migraine with aura or are over 35 and smoke.
- **Progestin-only pill** — safe while breastfeeding.
- **DMPA injection** — every 3 months.

## Barrier and emergency methods

- **Male and female condoms** — also protect against HIV and other STIs.
- **Emergency contraception (levonorgestrel)** — most effective within 72
  hours of unprotected sex, available without prescription.

## Permanent methods

- **Tubal ligation** for women.
- **Vasectomy** for men — a simple outpatient procedure.

## Which one is right for me?

Talk to a pharmacist or nurse about:

- Whether you plan another pregnancy in the next 2 years
- Whether you are breastfeeding
- Other health conditions
- Preference for daily vs occasional vs forget-and-go methods

There is no single "best" method — the best one is the one you can use
correctly and comfortably.
""",
    },

    # ---------------- Pediatrics ----------------
    {
        "title": "Child Nutrition: Building Strong Bodies and Minds",
        "slug": "child-nutrition-building-strong-bodies-and-minds",
        "category": "Pediatrics",
        "summary": (
            "Practical feeding guidance from birth through age 5 to prevent "
            "stunting and support brain development."
        ),
        "image_url": "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1200&q=80",
        "content": """
## The first 1000 days

From conception to a child's second birthday — the **first 1000 days** —
nutrition shapes lifelong health, school performance and earning potential.

## 0–6 months: exclusive breastfeeding

Breast milk alone meets all nutritional needs. No water, porridge or
gripe water. Feed on demand, day and night.

## 6–24 months: complementary feeding

Introduce mashed local foods alongside continued breastfeeding:

- **Energy**: porridge enriched with groundnut or sesame paste
- **Protein**: mashed beans, eggs, fish, meat
- **Vitamins**: mashed avocado, orange-fleshed sweet potato, banana, pawpaw
- **Iron**: liver, beans, fortified flour

Add a teaspoon of oil to porridge for energy and vitamin absorption.

## Frequency by age

- 6–8 months: 2–3 meals + 1–2 snacks
- 9–11 months: 3–4 meals + 1–2 snacks
- 12–24 months: 3–4 meals + 2 snacks

## Key micronutrients

- **Vitamin A** drops every 6 months from 6 months to 5 years (free at
  health centres).
- **Iron** — many Rwandan children are anaemic; ask about supplements if
  your child looks pale or is always tired.
- **Zinc** for 10–14 days during diarrhoea episodes, alongside ORS.

## Avoid

- Sugary drinks, sodas and packaged juice
- Tea or coffee (block iron absorption)
- Honey before 1 year
- Choking foods (whole groundnuts, popcorn) before 4 years

## Warning signs of malnutrition

- Weight loss or static weight on the growth chart
- Swelling of feet and face
- Loss of appetite, persistent diarrhoea
- Visible wasting of arms and thighs

Take the child to a health centre — therapeutic foods (Plumpy'Nut) are
free and life-saving.
""",
    },
    {
        "title": "Rwanda Childhood Vaccination Schedule Explained",
        "slug": "rwanda-childhood-vaccination-schedule-explained",
        "category": "Pediatrics",
        "summary": (
            "What each vaccine protects against and why staying on schedule "
            "matters."
        ),
        "image_url": "https://images.unsplash.com/photo-1584516150909-c43483ee7932?w=1200&q=80",
        "content": """
## The schedule (free at every health centre)

| Age | Vaccine |
|-----|---------|
| Birth | BCG (TB), OPV0 (polio) |
| 6 weeks | OPV1, Penta1 (DTP-HepB-Hib), PCV1, Rota1 |
| 10 weeks | OPV2, Penta2, PCV2, Rota2 |
| 14 weeks | OPV3, IPV, Penta3, PCV3 |
| 9 months | Measles-Rubella 1, Yellow Fever, MenA |
| 15 months | Measles-Rubella 2 |
| 9–14 years (girls) | HPV (cervical cancer prevention) |

## Common myths — addressed

- **"Vaccines cause autism."** False. The original study was fraudulent;
  hundreds of studies in millions of children show no link.
- **"My child is too small."** Healthy infants gain weight better when
  protected from infections.
- **"Natural immunity is better."** Catching the disease can kill or
  disable; vaccines train immunity safely.

## After-vaccination care

Mild fever, soreness or fussiness for 1–2 days is normal. Give paracetamol
at weight-based dose and extra fluids. Seek care for:

- High fever above 39°C lasting more than 48 hours
- Persistent crying for more than 3 hours
- Swelling larger than the size of an egg at the injection site
- Seizure or unresponsiveness

## Catch-up vaccination

If you miss a date, **do not start again** — simply continue from where
you stopped. Bring the immunisation card to every visit.
""",
    },

    # ---------------- Mental Health ----------------
    {
        "title": "Depression and Anxiety: Breaking the Silence",
        "slug": "depression-and-anxiety-breaking-the-silence",
        "category": "Mental Health",
        "summary": (
            "Mental illness is real, common and treatable. Spotting it early "
            "is the first step to getting better."
        ),
        "image_url": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&q=80",
        "content": """
## You are not alone

About 1 in 5 Rwandans will experience a mental health condition during
their lifetime. Genocide-related trauma still echoes through families.
Speaking up is strength, not weakness.

## Recognising depression

Symptoms lasting more than two weeks:

- Persistent sadness or emptiness
- Loss of interest in activities once enjoyed
- Sleeping too much or too little
- Loss of appetite or weight changes
- Difficulty concentrating
- Feelings of worthlessness or guilt
- Thoughts of death or suicide

## Recognising anxiety

- Constant worry that's hard to control
- Racing heart, sweating, shortness of breath
- Sleep difficulties
- Avoiding situations because of fear
- Panic attacks (sudden intense fear with physical symptoms)

## What helps

- **Talking therapy** with a trained counsellor — available at district
  hospitals and through NGOs such as the Healing Family Foundation.
- **Medication** when needed — SSRIs (e.g. fluoxetine, sertraline) are
  safe, non-addictive and effective.
- **Lifestyle**: regular sleep, daily walking, reduced alcohol, time with
  trusted friends.

## Supporting someone you love

- Listen without judging.
- Avoid "just be strong" or "pray harder" alone — both prayer and
  professional help can coexist.
- Help them attend appointments.
- Remove access to means of harm if there's suicidal talk.

## Emergency

If you or someone you know is thinking of suicide, call the **Rwanda
Mental Health Hotline (114)** or go to the nearest hospital emergency
department immediately.
""",
    },

    # ---------------- Nutrition ----------------
    {
        "title": "Rwandan Superfoods: Eating for Health on a Budget",
        "slug": "rwandan-superfoods-eating-for-health-on-a-budget",
        "category": "Nutrition",
        "summary": (
            "Forget expensive imports — Rwanda's own gardens grow some of the "
            "most nutrient-dense foods in the world."
        ),
        "image_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
        "content": """
## Local foods that punch above their weight

- **Isombe (cassava leaves)** — rich in protein, iron, vitamins A and C.
  Cook thoroughly to remove cyanide compounds.
- **Dodo (amaranth leaves)** — calcium, iron, folate.
- **Avocado** — heart-healthy fats, potassium, fibre.
- **Sweet potato (orange-fleshed)** — beta-carotene for eye and immune
  health.
- **Beans** — protein, iron, fibre; pair with vitamin C–rich fruit to boost
  iron absorption.
- **Sorghum and millet** — complex carbohydrates with B vitamins.
- **Sambaza and tilapia** — affordable omega-3 and high-quality protein.
- **Groundnuts and sesame** — energy-dense; add to porridge for children.
- **Tree tomato (igitomati cy'umuti)** — high in vitamins A, C and E.

## Building a balanced plate

Visualise your plate in three parts:

1. **½ vegetables and fruit**
2. **¼ whole grains** (sorghum, brown rice, less-refined ubugali)
3. **¼ protein** (beans, fish, eggs, occasional meat)

Add a small amount of healthy oil and a fruit for dessert.

## Hydration

Water remains the best drink. Limit soda and sweetened juice. African tea
without sugar is fine; ikivuguto in moderation provides probiotics.

## Cooking tips

- Steam or boil rather than deep-fry when possible.
- Add lemon juice to iron-rich foods to improve absorption.
- Avoid overcooking vegetables — short cooking preserves vitamin C.
""",
    },

    # ---------------- First Aid ----------------
    {
        "title": "Essential First Aid Every Rwandan Should Know",
        "slug": "essential-first-aid-every-rwandan-should-know",
        "category": "First Aid",
        "summary": (
            "Simple, evidence-based first aid steps for the most common "
            "household emergencies."
        ),
        "image_url": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=1200&q=80",
        "content": """
## Burns

1. **Cool with running water for 20 minutes** — not ice, not butter, not
   toothpaste.
2. Cover loosely with clean cling film or a non-stick dressing.
3. Give paracetamol for pain.
4. Seek care for burns larger than a palm, on the face, hands, feet,
   genitals, or any burn in a child or older adult.

## Cuts and bleeding

1. Apply **firm direct pressure** with a clean cloth for 10 minutes
   without peeking.
2. Elevate the limb if possible.
3. Once bleeding stops, clean with clean water and cover.
4. Go to hospital for deep cuts, cuts that won't stop bleeding, or any
   wound from a dirty/rusty object (tetanus risk).

## Choking (adult)

1. Encourage strong coughing.
2. If they cannot speak or breathe, give **5 firm back blows** between the
   shoulder blades.
3. Then **5 abdominal thrusts** (Heimlich).
4. Alternate until the object dislodges or help arrives.

## Choking (infant under 1 year)

Lay face-down along your forearm, head lower than chest; 5 back blows
between shoulder blades, then 5 chest thrusts using two fingers on the
breastbone. Alternate.

## Seizures

1. **Do not put anything in the mouth** — old advice that causes harm.
2. Move dangerous objects away.
3. Place something soft under the head.
4. Once the shaking stops, turn the person onto their side (recovery
   position).
5. Call for help if the seizure lasts more than 5 minutes, is the first
   ever, or another follows.

## Suspected stroke — FAST

- **F**ace drooping
- **A**rm weakness
- **S**peech slurred
- **T**ime — call an ambulance immediately. Treatments work best within
  the first 4.5 hours.

## Poisoning

Do not induce vomiting unless told to by a poison control specialist.
Bring the bottle or substance to hospital with the patient.
""",
    },

    # ---------------- Eye Health ----------------
    {
        "title": "Common Eye Conditions: When to See a Doctor",
        "slug": "common-eye-conditions-when-to-see-a-doctor",
        "category": "Eye Health",
        "summary": (
            "Pink eye, dry eyes, cataracts and glaucoma — what's urgent and "
            "what can wait."
        ),
        "image_url": "https://images.unsplash.com/photo-1559076070-29b07c5e9a3a?w=1200&q=80",
        "content": """
## Pink eye (conjunctivitis)

- **Viral**: watery discharge, often with a cold; very contagious; settles
  in 7–14 days with cool compresses and artificial tears.
- **Bacterial**: thick yellow-green discharge; usually responds to
  antibiotic eye drops (chloramphenicol).
- **Allergic**: itchy, swollen lids; antihistamine eye drops help.

> Wash hands frequently and use a separate towel until the eye clears.

## Dry eyes

Common with screen use and dry seasons. Try:

- 20-20-20 rule: every 20 minutes look 20 feet away for 20 seconds.
- Preservative-free artificial tears.
- Adequate hydration.

## Cataracts

Cloudy lens causing slowly worsening blurred vision, glare from headlights
and faded colours. Surgery is curative and now widely available in Rwanda
under RSSB.

## Glaucoma — the silent thief of sight

Often painless until late, when peripheral vision is already lost. Adults
over 40, anyone with diabetes, hypertension or family history should have
intra-ocular pressure measured every 1–2 years.

## Red flags — see an eye specialist urgently

- Sudden vision loss
- Curtain falling over part of vision (possible retinal detachment)
- Severe eye pain with nausea (possible acute glaucoma)
- Halos around lights with eye pain
- Foreign body or chemical splash — irrigate with clean water for 15
  minutes on the way to hospital
""",
    },

    # ---------------- Oral Health ----------------
    {
        "title": "Oral Health: More Than a Bright Smile",
        "slug": "oral-health-more-than-a-bright-smile",
        "category": "Oral Health",
        "summary": (
            "Healthy teeth and gums protect the heart, lungs and even blood "
            "sugar control. Simple habits go a long way."
        ),
        "image_url": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1200&q=80",
        "content": """
## Daily basics

- **Brush twice a day** for 2 minutes with a fluoride toothpaste
  (1000–1500 ppm fluoride).
- **Clean between teeth** with floss or interdental brushes once a day.
- **Replace your toothbrush** every 3 months or sooner if bristles splay.
- **Avoid sugary drinks** between meals — frequency matters more than
  quantity.

## Children

- Wipe gums with a clean cloth from birth.
- Start brushing with a smear of fluoride toothpaste when the first tooth
  appears.
- Avoid putting children to bed with a sweet bottle — "bottle caries" can
  destroy front teeth.

## Common problems

- **Tooth sensitivity** to cold or sweet — try a desensitising toothpaste
  for 2 weeks; see a dentist if it persists.
- **Bleeding gums** when brushing — early sign of gingivitis; usually
  reverses with better brushing and flossing within 2 weeks.
- **Toothache** with hot food and lasting more than 30 seconds suggests
  pulp involvement — see a dentist promptly.

## Mouth ulcers

Most heal in 7–14 days. Saltwater rinses help. See a doctor if an ulcer
lasts more than 3 weeks — could be an early sign of oral cancer,
especially in smokers and tobacco chewers.

## The whole-body link

Untreated gum disease worsens diabetes control, increases heart disease
risk and complicates pregnancy. Investing in oral health pays back.
""",
    },

    # ---------------- Skin ----------------
    {
        "title": "Common Skin Conditions in Rwanda and How to Treat Them",
        "slug": "common-skin-conditions-in-rwanda-and-how-to-treat-them",
        "category": "Skin Health",
        "summary": (
            "Eczema, fungal infections, scabies and acne — recognise them and "
            "know which over-the-counter remedies actually work."
        ),
        "image_url": "https://images.unsplash.com/photo-1576091160575-1ffd11b3a45e?w=1200&q=80",
        "content": """
## Eczema (atopic dermatitis)

- Itchy, dry, red patches; often in skin folds.
- **Moisturise twice daily** with thick emollient creams (petroleum jelly
  works well).
- Avoid harsh soaps and very hot baths.
- **Hydrocortisone 1% cream** for short flare-ups on the body; consult a
  clinician for face, groin or in young infants.

## Fungal infections

- **Tinea (ringworm)**: itchy ring-shaped patches; treat with clotrimazole
  or terbinafine cream twice daily for 2–4 weeks.
- **Athlete's foot**: between-toe peeling; keep feet dry, change socks
  daily, use antifungal cream or powder.
- Persistent or scalp fungal infections need oral medication — see a
  pharmacist.

## Scabies

- Intense night-time itch; tiny burrows between fingers, wrists, waist,
  genitals.
- Treat with **permethrin 5% cream** from neck down, leave 8–14 hours,
  wash off. Repeat after 7 days.
- Treat the **whole household** at the same time.
- Wash bedding and clothes in hot water.

## Acne

- Wash gently twice a day; avoid scrubbing.
- **Benzoyl peroxide 2.5–5%** is effective for mild-moderate acne.
- Avoid bleaching creams marketed for skin lightening — many contain
  mercury or strong steroids that thin the skin.
- See a clinician if cysts or scarring appear.

## When to see a clinician

- A mole that changes shape, colour or bleeds
- Any rash with fever or feeling unwell
- Wounds that don't heal in 2 weeks
- Sudden hair loss in patches
""",
    },

    # ---------------- Digestive Health ----------------
    {
        "title": "Managing Common Digestive Problems",
        "slug": "managing-common-digestive-problems",
        "category": "Digestive Health",
        "summary": (
            "Diarrhoea, constipation, heartburn and bloating — when to treat "
            "at home and when to seek care."
        ),
        "image_url": "https://images.unsplash.com/photo-1542736667-069246bdbc6d?w=1200&q=80",
        "content": """
## Acute diarrhoea

- Most viral; settles in 3–5 days.
- **Drink ORS (oral rehydration salts)** after every loose stool.
- Children: **add zinc** 20 mg/day for 10–14 days (10 mg for under 6
  months) — proven to shorten the episode and prevent recurrence.
- Continue feeding (including breastfeeding); avoid sugary sodas.

> See a clinician for: blood in stool, high fever, severe abdominal pain,
> signs of dehydration (sunken eyes, no urine for 6+ hours, lethargy in
> a child), or diarrhoea lasting more than 7 days.

## Constipation

- Increase **fibre** (whole grains, vegetables, fruit, beans).
- Drink at least 1.5–2 litres of water daily.
- Walk or move daily.
- Short-term relief: lactulose or a glycerol suppository.
- Avoid frequent use of strong stimulant laxatives.

## Heartburn and reflux

- Eat smaller, more frequent meals.
- Avoid lying down for 2–3 hours after eating.
- Elevate the head of the bed by 10–15 cm.
- Reduce caffeine, alcohol, very spicy food, fatty foods.
- Antacids (e.g. Maalox) for occasional relief; **omeprazole** or
  **ranitidine alternatives** for more frequent symptoms — speak to a
  pharmacist.

> Alarm symptoms: difficulty swallowing, unintentional weight loss, black
> tarry stools, vomiting blood. Seek urgent care.

## Bloating and IBS-type symptoms

Identify trigger foods (often beans, cabbage, milk if lactose intolerant),
eat slowly, manage stress. Probiotics may help some people.
""",
    },

    # ---------------- Elderly Care ----------------
    {
        "title": "Polypharmacy: Keeping Medication Safe in Older Adults",
        "slug": "polypharmacy-keeping-medication-safe-in-older-adults",
        "category": "Elderly Care",
        "summary": (
            "When someone takes 5+ medicines, the risk of harmful interactions "
            "rises sharply. Here's how families can help."
        ),
        "image_url": "https://images.unsplash.com/photo-1559757175-7cb036bd4d31?w=1200&q=80",
        "content": """
## Why older adults are at higher risk

- Kidneys and liver process drugs more slowly.
- Multiple chronic conditions = multiple prescribers.
- Memory changes affect dosing.
- Drug-drug and drug-food interactions multiply with each new prescription.

## Build a one-page medication list

For every medicine include:

- Name and strength
- Dose and time
- Reason for taking it
- Prescribing clinician

Bring this list to **every** medical visit.

## Bring everything in a bag — once a year

Schedule a **brown-bag review** with a pharmacist annually. They will:

- Spot duplications (two drugs doing the same job)
- Check for interactions
- Identify medicines that could be safely stopped (deprescribing)

## High-risk medicines to use cautiously in older adults

- **NSAIDs** (ibuprofen, diclofenac): kidney damage, ulcers, raised blood
  pressure.
- **Benzodiazepines** (diazepam): falls and confusion.
- **Long-acting sulphonylureas** (glibenclamide): risky hypoglycaemia.
- **Anticholinergics**: confusion, urinary retention.

## Practical safety tips

- Use a **weekly pill organiser** filled by a trusted family member.
- Set **phone alarms** for dose times.
- Keep medicines in original packaging when travelling.
- Never crush or split tablets without checking — some are designed for
  slow release.

## Watch for new symptoms after a new medicine starts

Confusion, dizziness, falls, constipation, urinary problems — these can
be drug side effects masquerading as ageing. Tell the clinician promptly.
""",
    },
]


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

async def seed_articles() -> None:
    engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    print(f"\nConnecting to {settings.ASYNC_DATABASE_URL.split('@')[-1]}")
    print(f"Preparing to seed {len(ARTICLES)} health articles...\n")

    try:
        async with SessionLocal() as db:
            # Resolve author (demo pharmacist) — optional.
            pharmacist_profile = None
            pharmacist_user = (
                await db.execute(
                    select(User).where(User.email == "pharmacist@farumasi.com")
                )
            ).scalar_one_or_none()
            if pharmacist_user:
                pharmacist_profile = (
                    await db.execute(
                        select(PharmacistProfile).where(
                            PharmacistProfile.user_id == pharmacist_user.id
                        )
                    )
                ).scalar_one_or_none()

            if pharmacist_profile:
                print(f"Author: pharmacist@farumasi.com ({pharmacist_profile.id})\n")
            else:
                print("Author: (none — demo pharmacist not found, articles will be unattributed)\n")

            now = datetime.now(timezone.utc)
            added = 0
            skipped = 0

            for entry in ARTICLES:
                slug = entry["slug"]
                existing = (
                    await db.execute(
                        select(HealthArticle).where(HealthArticle.slug == slug)
                    )
                ).scalar_one_or_none()

                if existing is not None:
                    print(f"  [skip] {slug}")
                    skipped += 1
                    continue

                db.add(
                    HealthArticle(
                        author_pharmacist_id=(
                            pharmacist_profile.id if pharmacist_profile else None
                        ),
                        title=entry["title"],
                        slug=slug,
                        summary=entry["summary"],
                        content=entry["content"].strip(),
                        category=entry["category"],
                        image_url=entry.get("image_url"),
                        status=ArticleStatus.PUBLISHED,
                        published_at=now,
                    )
                )
                added += 1
                print(f"  [+]    {entry['title']}")

            await db.commit()

            print(f"\nDone. Added {added}, skipped {skipped} (already present).")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_articles())
