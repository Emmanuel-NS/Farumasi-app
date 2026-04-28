import re

def update():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # Find the class statment up to Enhanced Search
    pattern = r'class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> \{.*?// Enhanced Search'
    replacement = '''class _PharmacistDashboardScreenState extends State<PharmacistDashboardScreen> {
  int _selectedIndex = 0;
  String? _activeRightSidebar;
  bool _isSidebarCollapsed = false;
  double _sidebarWidth = 200.0;
  static const Color _shellGreen = Color(0xFF1E9E68);

  // Dashboard Status Filter Tabs
  int _ordersFilterIndex = 0; // 0=All, 1=Requests, 2=Processing...

  // Enhanced Search'''
    text = re.sub(pattern, replacement, text, flags=re.DOTALL)

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

update()