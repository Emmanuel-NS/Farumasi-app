import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the GridView.count with a GridView using mainAxisExtent
# This ensures the cards never shrink vertically, completely eliminating bottom overflow
old_grid = '''          // Overview Stats
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: isWebWide ? 4 : 2,
            childAspectRatio: isWebWide ? 1.35 : 0.95, // Adjusted
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: ['''

new_grid = '''          // Overview Stats
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: isWebWide ? 4 : 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              mainAxisExtent: 160, // Fixed physical height to prevent any bottom overflow
            ),
            children: ['''

# If the exact string isn't matched due to whitespace changes, use regex
if old_grid not in text:
    pattern = r'GridView\.count\(\s*shrinkWrap: true,\s*physics: const NeverScrollableScrollPhysics\(\),\s*crossAxisCount:.*?(isWebWide \? 4 : 2|2),\s*childAspectRatio:.*?\n\s*crossAxisSpacing: 16,\s*mainAxisSpacing: 16,\s*children: \['
    
    text = re.sub(pattern, '''GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: isWebWide ? 4 : 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              mainAxisExtent: 160, // Fixed physical height prevents bottom overflow completely
            ),
            children: [''', text, flags=re.DOTALL)
else:
    text = text.replace(old_grid, new_grid)


with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Cards grid refactored!")
