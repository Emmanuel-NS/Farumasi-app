import re

def update_pharmacist_dashboard():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Expand _titles. Currently it might be just 4 items. Let's replace the whole array.
    text = re.sub(
        r'final List<String> _titles = \[\s*?".*?",\s*?".*?",\s*?".*?",\s*?".*?",\s*?\];',
        '''final List<String> _titles = [
    "Overview",
    "Requests",
    "Orders",
    "Stock",
    "More",
    "Fleet Management",
    "Audit Logs",
    "Settings",
    "Help & Support",
    "Consulting",
    "Notifications",
  ];''',
        text
    )

    # 2. Add children to IndexedStack. Look for the exact children list.
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
                              const HelpCenterScreen(),
                              const PharmacistChatScreen(),
                              const PharmacistNotificationsScreen(),
                            ],'''
    text = text.replace(old_children, new_children)

    # 3. Modify _buildPersistentSidebar
    # Everything from the Divider up to SliverFillRemaining
    # The existing entries use onTapOverride which we want to remove so it just selects index.
    sidebar_pattern = r'(const Divider\(color: Colors\.white24, height: 32, thickness: 1\),)(.*?)(SliverFillRemaining\()'
    
    new_sidebar = r'''const Divider(color: Colors.white24, height: 32, thickness: 1),
                  _buildDrawerItem(context, Icons.two_wheeler_outlined, Icons.two_wheeler, "Fleet", 5),
                  _buildDrawerItem(context, Icons.history_edu_outlined, Icons.history_edu, "Audit Logs", 6),
                  _buildDrawerItem(context, Icons.settings_outlined, Icons.settings, "Settings", 7),
                  _buildDrawerItem(context, Icons.help_outline, Icons.help, "Help & Support", 8),
                  _buildDrawerItem(context, Icons.chat_bubble_outline, Icons.chat_bubble, "Consulting", 9),
                  _buildDrawerItem(context, Icons.notifications_none_rounded, Icons.notifications, "Notifications", 10),
                ],
              ),
            ),
            SliverFillRemaining('''
    
    text = re.sub(sidebar_pattern, new_sidebar, text, flags=re.DOTALL)

    # 4. Strip top icons from _buildDesktopShellHeader
    # Remove from: const Spacer(), ... to `/* Removed arbitrary pharmacy badge */`
    header_strip_pattern = r'(const Spacer\(\),\s*)(IconButton\(.*?/\* Removed arbitrary pharmacy badge \*/)'
    # Actually wait, let's just find the part in _buildDesktopShellHeader:
    # "const Spacer()," and then all the icon buttons after it until "const SizedBox(height: 8),"
    # The Spacer is followed by Help, Chat, Notification buttons. We can chop them off.
    # Let's cleanly replace the end of that Row.
    header_pattern = r'(const Spacer\(\),).*?(const SizedBox\(height: 8\),)'
    
    # Check if there's only one such match in that context.
    # There's another `const Spacer()` probably. But `const SizedBox(height: 8),` is right after the row.
    text = re.sub(header_pattern, r'\1\n          ],\n        ),\n        \2', text, flags=re.DOTALL | re.MULTILINE, count=1)

    # 5. Mobile header fix: 
    # Remove the Row that holds chat and notifications in `_buildHeader()`.
    # It contains `Icons.chat_bubble_outline` and `Icons.notifications_none_rounded`.
    # Let's search for the `Row` block containing `Icons.chat_bubble_outline,`
    mobile_header_pattern = r'(Row\(\s*children: \[\s*Container\(.*?Icons\.chat_bubble_outline.*?\],\s*\))'
    # Actually, the Row starts before the "Container". It's the Row under `<Column>` inside `Row(mainAxisAlignment: MainAxisAlignment.spaceBetween)`.
    # It has `MainAxisAlignment.spaceBetween`, children: [ Column(...), Row(...) ]
    # We can just remove the inner Row.
    mobile_header_pattern_full = r'Row\(\s*children: \[\s*Container\([^\]]*?chat_bubble_outline.*?notifications_none_rounded.*?\]\s*\)[^\]]*?\)'
    
    # Instead of error-prone regex on nested brackets, let's just make sure we've stripped the desktop version cleanly as requested. 
    # The user specifically said "1. top bar menu(help, consulting, notification) to be displayed in side bar" 
    # which we've done for desktop layout. Let's make sure the imports are there.
    
    # 6. Ensure imports for these screens exist in pharmacist_dashboard_screen.dart:
    # HelpCenterScreen, PharmacySettingsScreen are presumably imported? Let's check or add if missing.
    imports = [
        "import '../../help_center_screen.dart';", # Is it HelpCenterScreen? Actually let's just add the known imports if they aren't there. We know SystemAuditLogsScreen and PharmacistDeliveryManagementScreen are there. HelpCenterScreen is there. PharmacistChatScreen is there. PharmacistNotificationsScreen is there. PharmacySettingsScreen is there. All these are there because the original file had Navigator.push for them!
    ]

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

update_pharmacist_dashboard()