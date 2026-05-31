"""Fix UTF-8 mojibake using explicit Unicode codepoints."""
import glob

# Mojibake sequences (as Python Unicode codepoints) -> correct character
REPLACEMENTS = [
    ("\u00e2\u20ac\u201d",   "\u2014"),  # â€" -> em-dash
    ("\u00e2\u20ac\u2122",   "\u2019"),  # â€™ -> right single quote
    ("\u00e2\u20ac\u0153",   "\u201c"),  # â€œ -> left double quote
    ("\u00e2\u20ac\u00a6",   "\u2026"),  # â€¦ -> ellipsis
    ("\u00c2\u00b7",          "\u00b7"),  # Â· -> middle dot
    ("\u00c2\u00a0",          " "),       # Â  -> regular space
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
            with open(fp, "r", encoding="utf-8") as f:
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
