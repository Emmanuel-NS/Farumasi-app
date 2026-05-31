"""Fix UTF-8 mojibake in super_admin and patient portal files."""
import os, glob

REPLACEMENTS = [
    ("â\x80\x94", "\u2014"),   # em-dash
    ("â\x80\x99", "\u2019"),   # right single quote
    ("â\x80\x9c", "\u201c"),   # left double quote
    ("â\x80\x9d", "\u201d"),   # right double quote
    ("â\x80\xa6", "\u2026"),   # ellipsis
    ("\xc2\xb7",  "\u00b7"),   # middle dot
    ("\xc2\xa0",  " "),        # non-breaking space
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
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            new = content
            for bad, good in REPLACEMENTS:
                new = new.replace(bad, good)
            if new != content:
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(new)
                fixed += 1
                print("Fixed:", fp)
        except Exception as e:
            print("Error:", fp, e)

print("Total files fixed:", fixed)
