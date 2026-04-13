import re

with open('lib/screens/order_tracking_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# We want to replace the whole Widget build(BuildContext context) up to Widget _buildTrackingInfoCard()
# So we need to capture the parts. Since the file is simple, I'll just write the entire new build method.
# Let's isolate the map layer
map_pattern = r'(// Map Layer\s*Container\(\s*color: Colors[\s\S]*?)(?=// Top Info Card)'
m_map = re.search(map_pattern, text)
map_code = m_map.group(1).strip() if m_map else ''

# Isolate top info card (just the Card)
card_pattern = r'(Card\(\s*elevation: 4,[\s\S]*?(?=Align\(\s*alignment: Alignment\.bottomCenter))'
m_card = re.search(card_pattern, text)
card_code = m_card.group(1).strip() if m_card else ''
# Need to strip out trailing ), and stuff from the Card.
# Instead of doing that, I'll write an exact replacement for ody: Stack( until Widget _buildTrackingInfoCard() {

old_body_pattern = r'body: Stack\([\s\S]*?Widget _buildTrackingInfoCard\(\) \{'

new_body = '''body: LayoutBuilder(
        builder: (context, constraints) {
          final bool isWebWide = constraints.maxWidth >= 800;

          // Sidebar Top Card (Pharmacy Info)
          final topInfoCard = Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFF1E9E68),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.store,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          "Picking up from",
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        Text(
                          _pharmacyName,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );

          // 1. The fully assembled Map
          final mapWidget = ''' + map_code + ''';

          // 2. The Recenter Button
          final recenterBtn = !_isAutoCentering
              ? Positioned(
                  right: 20,
                  bottom: isWebWide ? 30 : 270,
                  child: FloatingActionButton(
                    backgroundColor: Colors.white,
                    mini: true,
                    onPressed: _recenterMap,
                    child: const Icon(Icons.my_location, color: Colors.blue),
                  ),
                )
              : const SizedBox.shrink();

          if (isWebWide) {
            return Row(
              children: [
                // SIDEBAR
                Container(
                  width: 400,
                  color: Colors.grey.shade50,
                  child: SafeArea(
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: topInfoCard,
                        ),
                        Expanded(
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: _buildTrackingInfoCard(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // MAP AREA
                Expanded(
                  child: Stack(
                    children: [
                      mapWidget,
                      recenterBtn,
                    ],
                  ),
                ),
              ],
            );
          }

          // MOBILE LAYOUT (Stack)
          return Stack(
            children: [
              mapWidget,
              recenterBtn,
              Align(
                alignment: Alignment.topCenter,
                child: Padding(
                  padding: const EdgeInsets.only(top: 100, left: 20, right: 20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: SizedBox(
                      width: double.infinity,
                      child: topInfoCard,
                    ),
                  ),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 30, left: 20, right: 20),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: SizedBox(
                      width: double.infinity,
                      child: _buildTrackingInfoCard(),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTrackingInfoCard() {'''

new_text = re.sub(old_body_pattern, new_body, text)
with open('lib/screens/order_tracking_screen.dart', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Done refactoring layout!")

