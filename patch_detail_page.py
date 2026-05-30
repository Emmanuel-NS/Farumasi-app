"""Patch the detail page to navigate to /edit instead of opening a drawer."""

TARGET = r"c:\Users\PC\Farumasi-app\farumasi_pharmacist_portal\src\app\(pharmacist)\inventory\[id]\page.tsx"

content = open(TARGET, encoding='utf-8').read()

# 1. Remove useSearchParams from import line
content = content.replace(
    'import { useRouter, useSearchParams } from "next/navigation";',
    'import { useRouter } from "next/navigation";',
)

# 2. Remove searchParams const declaration
content = content.replace(
    '  const searchParams = useSearchParams();\n\n  const [product,',
    '  const [product,',
)

# 3. Remove showEdit state
content = content.replace(
    '  const [showEdit,       setShowEdit]       = useState(false);\n  const [activeModal,',
    '  const [activeModal,',
)

# 4. Remove auto-open effect
OLD_EFFECT = (
    '  /* Auto-open edit drawer when ?edit=1 */\n'
    '  useEffect(() => {\n'
    '    if (searchParams.get("edit") === "1") setShowEdit(true);\n'
    '  }, [searchParams]);\n\n'
    '  /* Fetch p'
)
NEW_EFFECT = '  /* Fetch p'
content = content.replace(OLD_EFFECT, NEW_EFFECT)

# 5. Button 1: hero area (white/glass style)
OLD_BTN1 = (
    '            onClick={() => setShowEdit(true)}\n'
    '            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"\n'
    '          >\n'
    '            <Pencil className="w-3.5 h-3.5" /> Edit Product'
)
NEW_BTN1 = (
    '            onClick={() => router.push(`/inventory/${id}/edit`)}\n'
    '            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"\n'
    '          >\n'
    '            <Pencil className="w-3.5 h-3.5" /> Edit Product'
)
content = content.replace(OLD_BTN1, NEW_BTN1)

# 6. Button 2: article section (farumasi-600 style)
OLD_BTN2 = (
    '      <button onClick={() => setShowEdit(true)}\n'
    '                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors">\n'
    '                  <Pencil className="w-3.5 h-3.5" /> Edit Product'
)
NEW_BTN2 = (
    '      <button onClick={() => router.push(`/inventory/${id}/edit`)}\n'
    '                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors">\n'
    '                  <Pencil className="w-3.5 h-3.5" /> Edit Product'
)
content = content.replace(OLD_BTN2, NEW_BTN2)

# 7. Remove the EditProductDrawer render block
OLD_DRAWER = (
    ' (\n'
    '        <EditProductDrawer\n'
    '          product={product}\n'
    '          onClose={() => setShowEdit(false)}\n'
    '          onSaved={(updated) => { setProduct(updated); setShowEdit(false); }}\n'
    '        />\n'
    '    '
)
NEW_DRAWER = (
    ' (\n'
    '        <></>\n'
    '    '
)
content = content.replace(OLD_DRAWER, NEW_DRAWER)

# Verify
checks = {
    'useSearchParams in imports': 'useSearchParams' in content[:500],
    'searchParams const': 'const searchParams = useSearchParams' in content,
    'showEdit state': 'const [showEdit,' in content,
    'auto-open effect': 'Auto-open edit drawer' in content,
    'EditProductDrawer render': 'onClose={() => setShowEdit(false)' in content,
}
for k, v in checks.items():
    print(f"{'BAD' if v else 'OK '} {k}")

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(content)
print('\nFile written.')
