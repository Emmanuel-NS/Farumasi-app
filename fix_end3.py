import re
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

old_str = '''          const SizedBox(height: 80),
        ],
      );
    });
  }

  Widget _buildUpcomingSessions() {'''

new_str = '''          const SizedBox(height: 80),
        ],
      ),
    );
  });
  }

  Widget _buildUpcomingSessions() {'''

text = text.replace(old_str, new_str)
with open(file, 'w', encoding='utf-8') as f:
    f.write(text)
print('End Fixed Again!')
