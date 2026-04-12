import sys
import re

file_path = 'lib/screens/home_screen.dart'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    pattern = re.compile(r'          const Spacer\(\),\n.*?Terms & Conditions.*?\]\,\n\s+\)\,\n\s+\)\;', re.DOTALL)
    
    rep = '''          const Spacer(),
          _buildDrawerItem(
            context,
            Icons.settings,
            'Settings',
            5,
            restricted: false,
            closeDrawerOnTap: false,
            collapsed: _isSidebarCollapsed,
            onTapOverride: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
          if (isLoggedIn)
            _buildDrawerItem(
              context,
              Icons.logout,
              'Logout',
              6,
              restricted: false,
              closeDrawerOnTap: false,
              collapsed: _isSidebarCollapsed,
              onTapOverride: () {
                StateService().logout();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Logged out successfully')),
                );
              },
            ),
          if (!_isSidebarCollapsed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: TextButton(
                  onPressed: () async {
                    final u = Uri.parse('https://example.com/terms');
                    if (await canLaunchUrl(u)) {
                      await launchUrl(u);
                    }
                  },
                  child: const Text(
                    'Terms & Conditions',
                    style: TextStyle(
                      color: Color(0xFF9BC8B5),
                      fontSize: 12,
                      decoration: TextDecoration.underline,
                      decorationColor: Color(0xFF9BC8B5),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );'''

    if pattern.search(text):
        new_text = pattern.sub(rep, text)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print('Updated sidebar footer.')
    else:
        print('Pattern not found.')
except Exception as e:
    print(e)
