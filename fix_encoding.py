"""Fix UTF-8 mojibake in super_admin and patient portal files."""
import os, re, glob

REPLACEMENTS = [
    ("â€"", "—"),   # em-dash
    ("â€™", "'"),   # right single quote
    ("â€œ", "\u201c"),  # left double quote
    ("â€\u009d", "\u201d"),  # right double quote
    ("â€¦", "…"),   # ellipsis
    ("Â·", "·"),    # middle dot
    ("Â ", " "),    # non-breaking space
]

patterns = [
    "farumasi_super_admin/src/**/*.tsx",
    "farumasi_super_admin/src/**/*.ts",
    "farumasi_patient_portal/src/**/*.tsx",
    "farumasi_patient_portal/src/**/*.ts",
]

fixed = 0
for pat in patterns:
    for fp in glob.glob(pat, recursive=True):
        with open(fp, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        new = content
        for bad, good in REPLACEMENTS:
            new = new.replace(bad, good)
        if new != content:
            with open(fp, "w", encoding="utf-8") as f:
                f.write(new)
            fixed += 1
            print(f"Fixed: {fp}")

print(f"\nTotal files fixed: {fixed}")
