"""Generate assets/icons/categories/*.svg from patient portal CategoryIcons.tsx paths."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TSX = ROOT / "farumasi_patient_portal" / "src" / "components" / "icons" / "CategoryIcons.tsx"
OUT = ROOT / "assets" / "icons" / "categories"

SVG_HEAD = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
    'fill="none" stroke="currentColor" stroke-width="2.5" '
    'stroke-linecap="round" stroke-linejoin="round">'
)
SVG_TAIL = "</svg>"


def main() -> None:
    text = TSX.read_text(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)

    # export const IconGeneral = makeIcon("IconGeneral", <> ... </>);
    pattern = re.compile(
        r'export const Icon(\w+) = makeIcon\("Icon\w+", <>\s*(.*?)\s*</>\);',
        re.DOTALL,
    )
    registry = re.findall(
        r'\{ name: "([^"]+)",\s*Icon: Icon(\w+)',
        text,
    )
    icon_bodies = {m.group(1): m.group(2).strip() for m in pattern.finditer(text)}
    name_to_icon = {name: icon for name, icon in registry}

    for name, icon_class in name_to_icon.items():
        body = icon_bodies.get(icon_class)
        if not body:
            print(f"skip {name}: no body for Icon{icon_class}")
            continue
        svg = SVG_HEAD + body + SVG_TAIL
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(f"wrote {name}.svg")

    # All chip uses grid icon
    grid = (
        SVG_HEAD
        + '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>'
        + '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
        + SVG_TAIL
    )
    (OUT / "all.svg").write_text(grid, encoding="utf-8")
    print("wrote all.svg")


if __name__ == "__main__":
    main()
