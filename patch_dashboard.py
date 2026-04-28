import re

def update_file():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # Expand Titles
    new_titles = '''  final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Inventory",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
  ];'''
    text = re.sub(r'  final List<String> _titles = \[.*?\];', new_titles, text, flags=re.DOTALL)

    # Expand indexed array
    old_children = '''                            children: [
                              _buildOverviewTab(),
                              _buildRequestsTab(),
                              _buildOrdersTab(),
                              _buildInventoryTab(),
                              _buildMoreTab(),
                            ],'''
    new_children = '''                            children: [
                              _buildOverviewTab(),
                              _buildRequestsTab(),
                              _buildOrdersTab(),
                              _buildInventoryTab(),
                              _buildMoreTab(),
                              const PharmacistDeliveryManagementScreen(),
                              const SystemAuditLogsScreen(),
                              const PharmacySettingsScreen(),
                            ],'''
    text = text.replace(old_children, new_children)

    # 1. State variable
    if 'String? _activeRightSidebar;' not in text:
        text = text.replace('int _selectedIndex = 0;', 'int _selectedIndex = 0;\n  String? _activeRightSidebar;')

    # 2. IconButton Help
    old_help = r"""          IconButton\(
            icon: const Icon\(
              Icons\.help_outline,
              color: Colors\.white70,
              size: 24,
            \),
            tooltip: 'Help & Support',
            onPressed: \(\) => Navigator\.push\(
              context,
              MaterialPageRoute\(builder: \(_\) => const HelpCenterScreen\(\)\),
            \),
          \),"""
    new_help = """          IconButton(
            icon: const Icon(
              Icons.help_outline,
              color: Colors.white70,
              size: 24,
            ),
            tooltip: 'Help & Support',
            onPressed: () {
              setState(() {
                _activeRightSidebar = _activeRightSidebar == 'help' ? null : 'help';
              });
            },
          ),"""
    text = re.sub(old_help, new_help, text)

    # 3. IconButton Consulting
    old_consulting = r"""                IconButton\(
                  icon: const Icon\(
                    Icons\.chat_bubble_outline,
                    color: Colors\.white,
                    size: 24,
                  \),
                  tooltip: 'Consulting',
                  onPressed: \(\) \{
                    Navigator\.push\(
                      context,
                      MaterialPageRoute\(
                        builder: \(_\) => const PharmacistChatScreen\(\),
                      \),
                    \);
                  \},
                \),"""
    new_consulting = """                IconButton(
                  icon: const Icon(
                    Icons.chat_bubble_outline,
                    color: Colors.white,
                    size: 24,
                  ),
                  tooltip: 'Consulting',
                  onPressed: () {
                    setState(() {
                      _activeRightSidebar = _activeRightSidebar == 'consulting' ? null : 'consulting';
                    });
                  },
                ),"""
    text = re.sub(old_consulting, new_consulting, text)

    # 4. IconButton Notifications
    old_notifications = r"""                IconButton\(
                  icon: const Icon\(
                    Icons\.notifications_none_rounded,
                    color: Colors\.white,
                    size: 26,
                  \),
                  tooltip: 'Notifications',
                  onPressed: \(\) \{
                    Navigator\.push\(
                      context,
                      MaterialPageRoute\(
                        builder: \(_\) => const PharmacistNotificationsScreen\(\),
                      \),
                    \);
                  \},
                \),"""
    new_notifications = """                IconButton(
                  icon: const Icon(
                    Icons.notifications_none_rounded,
                    color: Colors.white,
                    size: 26,
                  ),
                  tooltip: 'Notifications',
                  onPressed: () {
                    setState(() {
                      _activeRightSidebar = _activeRightSidebar == 'notifications' ? null : 'notifications';
                    });
                  },
                ),"""
    text = re.sub(old_notifications, new_notifications, text)

    # 5. Right Sidebar logic
    old_sidebar_def = r"""  Widget _buildRightContextSidebar\(BuildContext context\) \{
    final viewportWidth = MediaQuery\.of\(context\)\.size\.width;"""
    new_sidebar_def = """  Widget _buildRightContextSidebar(BuildContext context) {
    if (_activeRightSidebar != null) {
      Widget content;
      switch (_activeRightSidebar) {
        case 'help':
          content = const HelpCenterScreen(isEmbedded: true);
          break;
        case 'consulting':
          content = const PharmacistChatScreen(isEmbedded: true);
          break;
        case 'notifications':
          content = const PharmacistNotificationsScreen(isEmbedded: true);
          break;
        default:
          content = const SizedBox.shrink();
      }

      final viewportWidth = MediaQuery.of(context).size.width;
      final panelWidth = viewportWidth >= 1400
          ? 320.0
          : viewportWidth >= 1100
              ? 280.0
              : 220.0;

      return Container(
        width: panelWidth,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(left: BorderSide(color: Colors.grey.shade200)),
        ),
        child: SafeArea(
          left: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: Text(
                        _activeRightSidebar == 'help'
                            ? 'Help & Support'
                            : _activeRightSidebar == 'consulting'
                                ? 'Consulting'
                                : 'Notifications',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(() => _activeRightSidebar = null),
                    ),
                  ],
                ),
              ),
              Expanded(child: content),
            ],
          ),
        ),
      );
    }

    final viewportWidth = MediaQuery.of(context).size.width;"""
    text = re.sub(old_sidebar_def, new_sidebar_def, text)

    # 6. Sidebar Menu Items overriding `onTap` - Re-map indexed stack correctly
    # Fleet
    old_fleet = r"""                  _buildDrawerItem\(
                    context,
                    Icons\.two_wheeler_outlined,
                    Icons\.two_wheeler,
                    "Fleet",
                    4,
                    onTapOverride: \(\) => Navigator\.push\(
                      context,
                      MaterialPageRoute\(
                        builder: \(_\) =>
                            const PharmacistDeliveryManagementScreen\(\),
                      \),
                    \),
                  \),"""
    new_fleet = """                  _buildDrawerItem(
                    context,
                    Icons.two_wheeler_outlined,
                    Icons.two_wheeler,
                    "Fleet",
                    5,
                  ),"""
    text = re.sub(old_fleet, new_fleet, text)

    # Audit Logs
    old_audit = r"""                  _buildDrawerItem\(
                    context,
                    Icons\.history_edu_outlined,
                    Icons\.history_edu,
                    "Audit Logs",
                    5,
                    onTapOverride: \(\) => Navigator\.push\(
                      context,
                      MaterialPageRoute\(
                        builder: \(_\) => const SystemAuditLogsScreen\(\),
                      \),
                    \),
                  \),"""
    new_audit = """                  _buildDrawerItem(
                    context,
                    Icons.history_edu_outlined,
                    Icons.history_edu,
                    "Audit Logs",
                    6,
                  ),"""
    text = re.sub(old_audit, new_audit, text)

    # Settings
    old_settings = r"""                  _buildDrawerItem\(
                    context,
                    Icons\.settings_outlined,
                    Icons\.settings,
                    "Settings",
                    6,
                    onTapOverride: \(\) => Navigator\.push\(
                      context,
                      MaterialPageRoute\(
                        builder: \(_\) => const PharmacySettingsScreen\(\),
                      \),
                    \),
                  \),"""
    new_settings = """                  _buildDrawerItem(
                    context,
                    Icons.settings_outlined,
                    Icons.settings,
                    "Settings",
                    7,
                  ),"""
    text = re.sub(old_settings, new_settings, text)

    # Logout
    old_logout = r"""                  _buildDrawerItem\(
                    context,
                    Icons\.logout,
                    Icons\.logout,
                    "Logout",
                    7,"""
    new_logout = """                  _buildDrawerItem(
                    context,
                    Icons.logout,
                    Icons.logout,
                    "Logout",
                    8,"""
    text = re.sub(old_logout, new_logout, text)

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == '__main__':
    update_file()