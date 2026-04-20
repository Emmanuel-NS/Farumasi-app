import re

with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

old_grid = '''          // Overview Stats
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 0.95, // Adjusted to fix 16px vertical overflow
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,'''

new_grid = '''          // Overview Stats
          GridView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: MediaQuery.of(context).size.width > 900 ? 4 : 2,
              mainAxisExtent: 180, // Fixed height to prevent overflow and maintain proportion
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),'''

if old_grid in text:
    text = text.replace(old_grid, new_grid)
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced grid view.")
else:
    print("Grid pattern not found.")
