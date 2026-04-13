import re
with open('lib/screens/order_tracking_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport 'package:flutter/foundation.dart' show kIsWeb;")

with open('lib/screens/order_tracking_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)
