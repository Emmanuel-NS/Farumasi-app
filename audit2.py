import os, re

API_PAT = re.compile(r'Service\.|api\.|fetch\(|axios\.|useQuery|useMutation', re.IGNORECASE)
MOCK_IMPORT = re.compile(r"from\s+[\"'].*mock[\"']|from\s+[\"'].*data/mock[\"']")

suspect_pages = [
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\customers\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\notifications\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\support\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\settings\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\inventory\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\products\catalogue\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\products\listed\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app\(portal)\orders\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_pharmacist_portal\src\app\(pharmacist)\audit\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_pharmacist_portal\src\app\(pharmacist)\notifications\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app\(patient)\orders\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app\(patient)\health\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app\(patient)\prescriptions\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app\(patient)\profile\page.tsx',
    r'C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app\(patient)\notifications\page.tsx',
]

for p in suspect_pages:
    if not os.path.exists(p):
        print(f'MISSING: {p}')
        continue
    c = open(p, encoding='utf-8').read()
    has_api = bool(API_PAT.search(c))
    has_mock = bool(MOCK_IMPORT.search(c))
    label = p.split('Farumasi-app\\')[1]
    if has_mock:
        print(f'MOCK_IMPORT: {label}')
    elif not has_api:
        # Show first 3 non-import lines to understand what data it uses
        lines = [l.strip() for l in c.splitlines() if l.strip() and not l.strip().startswith('import') and not l.strip().startswith('//')and not l.strip().startswith('*')]
        print(f'NO_API: {label}')
        for l in lines[:5]:
            print(f'  {l[:100]}')
    else:
        print(f'OK: {label}')
