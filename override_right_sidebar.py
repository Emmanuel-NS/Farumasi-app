import re

def update_home_screen():
    file_path = 'lib/screens/home_screen.dart'
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Add state variable
    if '_activeRightSidebar' not in text:
        text = text.replace(
            '  bool _isSidebarCollapsed = false;\n  double _sidebarWidth = 200.0;',
            '  bool _isSidebarCollapsed = false;\n  double _sidebarWidth = 200.0;\n  String? _activeRightSidebar;'
        )

    # Add right sidebar widget
    right_sidebar_code = '''
  Widget _buildActiveRightSidebar() {
    if (_activeRightSidebar == null) return const SizedBox.shrink();
    
    Widget content;
    switch (_activeRightSidebar) {
      case 'notifications':
        content = const NotificationScreen(isEmbedded: true);
        break;
      case 'cart':
        content = const CartScreen(isEmbedded: true);
        break;
      default:
        content = const SizedBox.shrink();
    }

    return Container(
      width: 350,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(left: BorderSide(color: Colors.grey.shade300)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(-5, 0),
          )
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _activeRightSidebar == 'cart' ? 'Your Cart' : 'Notifications',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
    );
  }
'''
    if '_buildActiveRightSidebar' not in text:
        # Insert before _buildPages
        text = text.replace('  List<Widget> _buildPages(bool embedStoreInShell) {', right_sidebar_code + '\n  List<Widget> _buildPages(bool embedStoreInShell) {')

    # Update Row children to include the right sidebar
    row_pattern = r'                            Expanded\(\n                              child: ClipRRect\(.*?\n                                child: Container\(.*?\n                                  color: const Color\(0xFFF6F8FB\),\n                                  child: pages\[_currentIndex\],\n                                \),\n                              \),\n                            \),'
    new_row = '''                            Expanded(
                              child: Stack(
                                children: [
                                  Positioned.fill(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.only(topLeft: Radius.circular(32)),
                                      child: Container(
                                        color: const Color(0xFFF6F8FB),
                                        child: pages[_currentIndex],
                                      ),
                                    ),
                                  ),
                                  if (_activeRightSidebar != null)
                                    Positioned(
                                      right: 0,
                                      top: 0,
                                      bottom: 0,
                                      child: _buildActiveRightSidebar(),
                                    ),
                                ],
                              ),
                            ),'''
    text = re.sub(row_pattern, new_row, text, flags=re.DOTALL)

    # Update Cart icon tap
    cart_pattern = r'_buildShellHeaderIcon\(\n\s*icon: Icons\.shopping_cart_outlined,\n\s*tooltip: \'Cart\',\n\s*onTap: \(\) \{\n\s*Navigator\.push\(\n\s*context,\n\s*MaterialPageRoute\(builder: \(_\) => const CartScreen\(\)\),\n\s*\);\n\s*\},\n\s*\),'
    cart_repl = '''_buildShellHeaderIcon(
                    icon: Icons.shopping_cart_outlined,
                    tooltip: 'Cart',
                    onTap: () {
                      setState(() {
                        _activeRightSidebar = _activeRightSidebar == 'cart' ? null : 'cart';
                      });
                    },
                  ),'''
    text = re.sub(cart_pattern, cart_repl, text, flags=re.DOTALL)

    # Update Notifications icon tap
    notif_pattern = r'_buildShellHeaderIcon\(\n\s*icon: Icons\.notifications_none,\n\s*tooltip: \'Notifications\',\n\s*onTap: \(\) \{\n\s*Navigator\.push\(\n\s*context,\n\s*MaterialPageRoute\(builder: \(_\) => const NotificationScreen\(\)\),\n\s*\);\n\s*\},\n\s*\)'
    notif_repl = '''_buildShellHeaderIcon(
              icon: Icons.notifications_none,
              tooltip: 'Notifications',
              onTap: () {
                setState(() {
                  _activeRightSidebar = _activeRightSidebar == 'notifications' ? null : 'notifications';
                });
              },
            )'''
    text = re.sub(notif_pattern, notif_repl, text, flags=re.DOTALL)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)

update_home_screen()
