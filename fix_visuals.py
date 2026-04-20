import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Darker background for more contrast (Slate 200)
text = text.replace('final Color _bgWhite = const Color(0xFFF3F4F6); // Soft gray for higher contrast, less glare', 
                    'final Color _bgWhite = const Color(0xFFE2E8F0); // Deep grey canvas for strong card contrast')

# 2. Increase mainAxisExtent to perfectly eliminate the 13px overflow of the Revenue card
text = text.replace('mainAxisExtent: 160,', 'mainAxisExtent: 184, // Increased physical height to hold larger texts')

# 3. Bar Chart improvements: wider bars, less whitespace
text = text.replace('width: 8,', 'width: 16,')
text = text.replace('alignment: BarChartAlignment.spaceAround,', 'alignment: BarChartAlignment.spaceEvenly,')


with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print('Visual layout enhanced!')
