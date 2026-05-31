import os
import re

stub_pages = [
    'ai-insights', 'forecasting', 'recommendations', 'intelligence',
    'shortage-intelligence', 'predictions', 'bi', 'system-monitoring',
    'availability', 'integrations', 'feature-flags', 'api-management',
    'departments', 'roles', 'security', 'suppliers', 'ecosystem'
]

base = r'C:\Users\PC\Farumasi-app\farumasi_super_admin\src\app\(portal)'

for stub in stub_pages:
    path = os.path.join(base, stub, 'page.tsx')
    if not os.path.exists(path):
        print(f'SKIP (not found): {stub}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    new = content
    new = new.replace('from "@/components/shared/page-header"', 'from "@/components/ui"')
    new = new.replace("from '@/components/shared/page-header'", "from '@/components/ui'")
    new = new.replace('from "@/components/ui/card"', 'from "@/components/ui"')
    new = new.replace("from '@/components/ui/card'", "from '@/components/ui'")
    # Merge duplicate named imports from @/components/ui
    new = re.sub(
        r'import \{ ([^}]+) \} from "@/components/ui";\nimport \{ ([^}]+) \} from "@/components/ui";',
        lambda m: f'import {{ {m.group(1).strip()}, {m.group(2).strip()} }} from "@/components/ui";',
        new
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new)
    print(f'Fixed: {stub}')

print('Done.')
