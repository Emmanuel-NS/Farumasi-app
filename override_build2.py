import re
file = 'lib/screens/pharmacist/pharmacist_dashboard_screen.dart'
with open(file, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('  @override\n  Widget build(BuildContext context) {')
end = text.find('  Widget _buildDesktopShellHeader')

if start != -1 and end != -1:
    new_text = text[:start] + '''  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent),
      child: AnimatedBuilder(
        animation: _service,
        builder: (context, _) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final bool isWebWide = constraints.maxWidth >= 900;
              final contentArea = Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1100), child: Column(
                children: [
                  if (!isWebWide) _buildHeader(),
                  Expanded(
                    child: IndexedStack(
                      index: _selectedIndex,
                      children: [
                        _buildOverviewTab(),
                        _buildRequestsTab(),
                        _buildOrdersTab(),
                        _buildInventoryTab(),
                        _buildMoreTab(),
                      ],
                    ),
                  ),
                ],
              )));
              
              final fab = _selectedIndex == 3
                  ? FloatingActionButton.extended(
                      backgroundColor: _primaryGreen,
                      icon: const Icon(Icons.add, color: Colors.white),
                      label: const Text("New Product", style: TextStyle(color: Colors.white)),
                      onPressed: () async {
                        final result = await Navigator.push(context, MaterialPageRoute(builder: (c) => const InventoryEditScreen()));
                        if (result != null && result is Medicine) setState(() => _inventoryList.insert(0, result));
                      },
                    )
                  : null;

              if (isWebWide) {
                return Scaffold(
                  backgroundColor: _bgWhite,
                  body: Column(
                    children: [
                      _buildDesktopShellHeader(context),
                      Expanded(
                        child: Container(
                          color: _shellGreen,
                          child: Row(
                            children: [
                              _buildPersistentSidebar(context),
                              MouseRegion(
                                cursor: SystemMouseCursors.resizeLeftRight,
                                child: GestureDetector(
                                  behavior: HitTestBehavior.opaque,
                                  onPanUpdate: (details) {
                                    setState(() {
                                      _sidebarWidth += details.delta.dx;
                                      if (_sidebarWidth < 140) {
                                        _isSidebarCollapsed = true;
                                        _sidebarWidth = 200;
                                      } else {
                                        _isSidebarCollapsed = false;
                                        if (_sidebarWidth > 400) _sidebarWidth = 400;
                                      }
                                    });
                                  },
                                  child: Container(
                                    width: 14, color: Colors.transparent,
                                    child: Center(
                                      child: Container(
                                        width: 4, height: 36,
                                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(2)),
                                        child: const Column(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [Icon(Icons.circle, size: 2, color: Colors.white),Icon(Icons.circle, size: 2, color: Colors.white),Icon(Icons.circle, size: 2, color: Colors.white)]),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(16)),
                                  child: Scaffold(backgroundColor: _bgWhite, body: contentArea, floatingActionButton: fab),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return PopScope(
                canPop: _selectedIndex == 0,
                // ignore: deprecated_member_use
                onPopInvoked: (didPop) {
                  if (didPop) return;
                  if (_selectedIndex != 0) setState(() => _selectedIndex = 0);
                },
                child: Scaffold(
                  backgroundColor: _bgWhite,
                  body: SafeArea(child: contentArea),
                  floatingActionButton: fab,
                  bottomNavigationBar: BottomNavigationBar(
                    currentIndex: _selectedIndex,
                    onTap: (index) => setState(() => _selectedIndex = index),
                    type: BottomNavigationBarType.fixed,
                    backgroundColor: Colors.white,
                    selectedItemColor: _primaryGreen,
                    unselectedItemColor: Colors.grey.shade400,
                    showSelectedLabels: true,
                    showUnselectedLabels: true,
                    selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                    items: const [
                      BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: "Overview"),
                      BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: "Requests"),
                      BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), activeIcon: Icon(Icons.shopping_bag), label: "Orders"),
                      BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2), label: "Stock"),
                      BottomNavigationBarItem(icon: Icon(Icons.more_horiz_outlined), activeIcon: Icon(Icons.more_horiz), label: "More"),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

''' + text[end:]

    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Sliced correctly!")
else:
    print("Failed to find boundaries.", start, end)

