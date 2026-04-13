import re

file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace _buildDesktopShellHeader
header_pattern = r'  Widget _buildDesktopShellHeader\(BuildContext context\) \{.*?    \);(.*?)  \}'
new_header = '''  Widget _buildDesktopShellHeader(BuildContext context) {
    return Container(
      height: 72,
      width: double.infinity,
      decoration: const BoxDecoration(color: _shellGreen),
      child: Row(
        children: [
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              _isSidebarCollapsed ? Icons.menu : Icons.menu_open,
              color: Colors.white,
              size: 28,
            ),
            tooltip: _isSidebarCollapsed ? 'Expand menu' : 'Collapse menu',
            onPressed: () => setState(() => _isSidebarCollapsed = !_isSidebarCollapsed),
          ),
          const SizedBox(width: 6),
          const store_screen.FarumasiLogo(size: 26, color: Colors.white, onDark: true),
          const SizedBox(width: 10),
          if (MediaQuery.of(context).size.width > 800)
            const Text('Farumasi Pharmacist', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w600, letterSpacing: 1.0)),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.help_outline, color: Colors.white70, size: 24),
            tooltip: 'Help & Support',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen())),
          ),
          const SizedBox(width: 8),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 24),
                tooltip: 'Consulting',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PharmacistChatScreen()),
                  );
                }
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Text("1", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Colors.white),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PharmacistNotificationsScreen()),
                  );
                }
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                  child: const Text("3", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'profile') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileManagementScreen()));
              } else if (value == 'logout') {
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
              }
            },
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: const CircleAvatar(radius: 18, backgroundColor: Colors.white24, child: Icon(Icons.person, color: Colors.white, size: 20)),
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(value: 'profile', child: ListTile(leading: Icon(Icons.person_outline), title: Text('Profile Management'), contentPadding: EdgeInsets.zero)),
              const PopupMenuItem<String>(value: 'logout', child: ListTile(leading: Icon(Icons.logout, color: Colors.red), title: Text('Logout', style: TextStyle(color: Colors.red)), contentPadding: EdgeInsets.zero)),
            ],
          ),
          const SizedBox(width: 24),
        ],
      ),
    );
  }'''

text = re.sub(header_pattern, new_header, text, flags=re.DOTALL)

sidebar_pattern = r'          _buildDrawerItem\(context, Icons\.logout, Icons\.logout, "Logout", 7,.*?          \),\n          const SizedBox\(height: 16\),\n        \],\n      \),\n    \);'
new_sidebar = '''          _buildDrawerItem(context, Icons.logout, Icons.logout, "Logout", 7,
            onTapOverride: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen())),
          ),
          if (!_isSidebarCollapsed)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()));
                  },
                  child: const Text(
                    'Privacy & Terms',
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
          const SizedBox(height: 16),
        ],
      ),
    );'''
text = re.sub(sidebar_pattern, new_sidebar, text, flags=re.DOTALL)

with open(file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updates applied to top and sidebar")
