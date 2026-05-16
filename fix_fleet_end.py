import re

with open('lib/screens/pharmacist/pharmacist_delivery_management_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

end_search = """              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveOrdersTab() {"""

end_replacement = """              ],
            ),
          ),
        ],
      ),
        ),
      ],
    );
  }

  Widget _buildActiveOrdersTab() {"""

text = text.replace(end_search, end_replacement)

with open('lib/screens/pharmacist/pharmacist_delivery_management_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Safely patched fleet screen end')
