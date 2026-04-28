import re

def update_layout():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # Expand IndexedStack correctly
    old_children = '''                        child: IndexedStack(
                          index: _selectedIndex,
                          children: [
                            _buildOverviewTab(),
                            _buildRequestsTab(),
                            _buildOrdersTab(),
                            _buildInventoryTab(),
                            _buildMoreTab(),
                          ],
                        ),'''
    new_children = '''                        child: IndexedStack(
                          index: _selectedIndex,
                          children: [
                            _buildOverviewTab(),
                            _buildRequestsTab(),
                            _buildOrdersTab(),
                            _buildInventoryTab(),
                            _buildMoreTab(),
                            const PharmacistDeliveryManagementScreen(),
                            const SystemAuditLogsScreen(),
                            const PharmacySettingsScreen(),
                          ],
                        ),'''
    if old_children in text:
        text = text.replace(old_children, new_children)

    # 1. Update the layout condition inside `build()`
    old_content_area_def = r'''              final contentArea = Center\(
                child: ConstrainedBox\(
                  constraints: const BoxConstraints\(maxWidth: 1100\),
                  child: Column\(
                    children: \[
                      if \(\!isWebWide\) _buildHeader\(\),
                      Expanded\('''
    
    new_content_area_def = '''              final contentArea = (_activeRightSidebar != null && !isWebWide)
                  ? _buildRightContextSidebar(context, fullWidth: true)
                  : Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1100),
                  child: Column(
                    children: [
                      if (!isWebWide) _buildHeader(),
                      Expanded('''

    text = re.sub(old_content_area_def, new_content_area_def, text)

    # 2. Update the Expanded layout wrapper on WebWide layout
    old_expanded_web = r'''                              Expanded\(
                                child: ClipRRect\(
                                  borderRadius: const BorderRadius\.only\(
                                    topLeft: Radius\.circular\(16\),
                                  \),
                                  child: Scaffold\(
                                    backgroundColor: _bgWhite,
                                    body: Row\(
                                      children: \[
                                        Expanded\(child: contentArea\),
                                        _buildRightContextSidebar\(context\),
                                      \],
                                    \),
                                    floatingActionButton: fab,
                                  \),
                                \),
                              \),'''

    # Ensure right sidebar looks exactly like home_screen context panel
    new_expanded_web = '''                              Expanded(
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.only(
                                    topLeft: Radius.circular(32),
                                  ),
                                  child: Container(
                                    color: _bgWhite,
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: AnimatedContainer(
                                            duration: const Duration(milliseconds: 300),
                                            curve: Curves.easeInOutCubic,
                                            margin: EdgeInsets.only(
                                              right: (_activeRightSidebar != null) ? 12.0 : 0.0,
                                            ),
                                            child: ClipRRect(
                                              borderRadius: BorderRadius.only(
                                                topLeft: const Radius.circular(32),
                                                topRight: (_activeRightSidebar != null)
                                                    ? const Radius.circular(24)
                                                    : Radius.zero,
                                                bottomRight: Radius.zero,
                                              ),
                                              child: Container(
                                                color: const Color(0xFFF6F8FB),
                                                child: Scaffold(
                                                  backgroundColor: Colors.transparent,
                                                  body: contentArea,
                                                  floatingActionButton: fab,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                        AnimatedSize(
                                          duration: const Duration(milliseconds: 300),
                                          curve: Curves.easeInOutCubic,
                                          child: (_activeRightSidebar != null)
                                              ? ClipRRect(
                                                  borderRadius: const BorderRadius.only(
                                                    topLeft: Radius.circular(24),
                                                    topRight: Radius.circular(24),
                                                  ),
                                                  child: _buildRightContextSidebar(context, fullWidth: false),
                                                )
                                              : const SizedBox.shrink(),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),'''
    text = re.sub(old_expanded_web, new_expanded_web, text)

    # 3. Update `_buildRightContextSidebar` to respect fullWidth & remove old hardcoded default panel
    old_sidebar_decl = r"""  Widget _buildRightContextSidebar\(BuildContext context\) \{
    if \(_activeRightSidebar \!\= null\) \{
      Widget content;"""
    
    new_sidebar_decl = """  Widget _buildRightContextSidebar(BuildContext context, {bool fullWidth = false}) {
    if (_activeRightSidebar != null) {
      Widget content;"""
    
    text = re.sub(old_sidebar_decl, new_sidebar_decl, text)

    old_panel_width_logic = r"""      final viewportWidth = MediaQuery\.of\(context\)\.size\.width;
      final panelWidth = viewportWidth >= 1400
          \? 320\.0
          : viewportWidth >= 1100
              \? 280\.0
              : 220\.0;

      return Container\(
        width: panelWidth,"""
        
    new_panel_width_logic = """      final viewportWidth = MediaQuery.of(context).size.width;
      final panelWidth = fullWidth 
          ? double.infinity 
          : 360.0;

      return Container(
        width: panelWidth,"""
    text = re.sub(old_panel_width_logic, new_panel_width_logic, text)

    # Remove the dead code at the bottom
    old_dead_code = r"""    \}

    final viewportWidth = MediaQuery\.of\(context\)\.size\.width;.*?  Widget _buildRightContextContent\(\) \{"""
    
    new_dead_code = """    }
    return const SizedBox.shrink();
  }

  Widget _buildRightContextContent() {"""
    text = re.sub(old_dead_code, new_dead_code, text, flags=re.DOTALL)

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == '__main__':
    update_layout()