content = open('c:/Users/PC/Farumasi-app/farumasi_patient_portal/src/lib/services/products.service.ts', encoding='utf-8').read()

old = (
    '  // Use real listing price if available, fall back to deterministic placeholder\n'
    '  const displayPrice = p.price_from != null\n'
    '    ? Math.round(p.price_from)\n'
    '    : 1500 + (p.id.charCodeAt(0) % 10) * 500;\n'
    '  return {'
)
new = (
    '  // Use real listing price if available, fall back to deterministic placeholder\n'
    '  const displayPrice = p.price_from != null\n'
    '    ? Math.round(p.price_from)\n'
    '    : 1500 + (p.id.charCodeAt(0) % 10) * 500;\n'
    '  const maxPrice = p.price_to != null\n'
    '    ? Math.round(p.price_to)\n'
    '    : displayPrice;\n'
    '  return {'
)
print('found old:', old in content)
new_content = content.replace(old, new, 1)

# Also fix maxPrice: Math.round(displayPrice * 1.3) -> maxPrice: maxPrice
new_content = new_content.replace(
    'maxPrice: Math.round(displayPrice * 1.3),',
    'maxPrice: maxPrice,'
)

# Also add price_to to the BackendProduct interface
new_content = new_content.replace(
    '  /** Lowest listing price across active pharmacy/partner listings (RWF) */\n  price_from: number | null;\n  /** Number of active sellers',
    '  /** Lowest listing price across active pharmacy/partner listings (RWF) */\n  price_from: number | null;\n  /** Highest listing price across active pharmacy/partner listings (RWF) */\n  price_to: number | null;\n  /** Number of active sellers'
)

open('c:/Users/PC/Farumasi-app/farumasi_patient_portal/src/lib/services/products.service.ts', 'w', encoding='utf-8').write(new_content)
print('done')
