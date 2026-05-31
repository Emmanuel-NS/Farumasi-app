"""Deep audit: scan all portal pages for hardcoded/mock data patterns."""
import os, re

portals = {
    "super_admin": r"C:\Users\PC\Farumasi-app\farumasi_super_admin\src\app",
    "partner": r"C:\Users\PC\Farumasi-app\farumasi_partner_portal\src\app",
    "pharmacist": r"C:\Users\PC\Farumasi-app\farumasi_pharmacist_portal\src\app",
    "patient": r"C:\Users\PC\Farumasi-app\farumasi_patient_portal\src\app",
}

# Patterns that indicate hardcoded/mock data
MOCK_PATTERNS = [
    (r'from\s+["\'].*mock["\']', "mock import"),
    (r'from\s+["\'].*data/mock["\']', "data/mock import"),
    (r'from\s+["\'].*demo["\']', "demo import"),
    (r'const\s+\w+\s*=\s*\[[\s\S]{10,500}name:\s*["\']', "hardcoded array with name field"),
    (r'useState<[^>]+>\s*\(\s*\[[\s\n\r\s]*\{', "useState with hardcoded array"),
    (r'//\s*TODO|//\s*FIXME|//\s*HACK|//\s*TEMP', "TODO/FIXME"),
    (r'Math\.random\(\)|Math\.floor\(Math\.random', "random data generation"),
    (r'Array\.from\(\{.*length.*\},.*i\)', "Array.from fake data generation"),
    (r'"[A-Z][a-z]+ [A-Z][a-z]+"[,\s]*//.*fake|fake.*"[A-Z][a-z]+ [A-Z][a-z]+"', "hardcoded person name"),
]

# Positive patterns - indicates real API usage
API_PATTERNS = [
    r'api\.get|api\.post|api\.put|api\.patch|api\.delete',
    r'fetch\(|axios\.|useQuery|useMutation',
    r'\.service\.|Service\(',
    r'useEffect.*api\.|api\..*useEffect',
]

results = {}

for portal, path in portals.items():
    issues = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.next']]
        for f in files:
            if not f.endswith('.tsx') and not f.endswith('.ts'):
                continue
            fpath = os.path.join(root, f)
            rel = fpath.replace(path + os.sep, '')
            try:
                content = open(fpath, encoding='utf-8').read()
            except:
                continue
            
            file_issues = []
            for pattern, label in MOCK_PATTERNS:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    file_issues.append(f"  [{label}]: {matches[0][:80]}")
            
            if file_issues:
                has_api = any(re.search(p, content) for p in API_PATTERNS)
                issues.append(f"\n{rel} {'(has API calls)' if has_api else '(NO API CALLS)'}")
                issues.extend(file_issues)
    
    results[portal] = issues

for portal, issues in results.items():
    print(f"\n{'='*60}")
    print(f"PORTAL: {portal.upper()}")
    print(f"{'='*60}")
    if issues:
        for i in issues:
            print(i)
    else:
        print("  CLEAN - no mock/hardcoded data detected")

print("\n\n=== SUMMARY ===")
for portal, issues in results.items():
    count = len([i for i in issues if i.startswith('\n')])
    print(f"{portal}: {count} file(s) with issues")
