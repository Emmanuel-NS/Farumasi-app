const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, '../farumasi_patient_portal/src/lib/kigali-locations.ts');
const ts = fs.readFileSync(tsPath, 'utf8');
const m = ts.match(/export const KIGALI_HOODS[^=]+=\s*(\{[\s\S]*?\n\};)/);
if (!m) {
  console.error('Could not parse KIGALI_HOODS');
  process.exit(1);
}
const objStr = m[1].replace(/;$/, '');
const hoods = new Function('return ' + objStr.replace(/ as const/g, ''))();
const districts = ['Gasabo', 'Nyarugenge', 'Kicukiro'];

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

let out = '/// Mirrors `farumasi_patient_portal/src/lib/kigali-locations.ts`.\n\n';
out += "const kigaliDeliveryDistricts = ['Gasabo', 'Nyarugenge', 'Kicukiro'];\n\n";
out += 'const kigaliHoods = <String, List<String>>{\n';
for (const d of districts) {
  out += `  '${d}': [\n`;
  for (const h of hoods[d]) {
    out += `    '${esc(h)}',\n`;
  }
  out += '  ],\n';
}
out += '};\n\n';
out += `List<String> hoodsForDistrict(String district) {
  if (district.isEmpty) return [];
  for (final d in kigaliDeliveryDistricts) {
    if (d.toLowerCase() == district.toLowerCase()) {
      return {...kigaliHoods[d]!}.toList()..sort();
    }
  }
  return [];
}

bool isKigaliDeliveryDistrict(String district) {
  return kigaliDeliveryDistricts
      .any((d) => d.toLowerCase() == district.toLowerCase());
}

const kigaliDeliveryDistrictList = kigaliDeliveryDistricts;
`;

const outPath = path.join(__dirname, '../lib/core/kigali_locations.dart');
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath, out.length, 'bytes');
