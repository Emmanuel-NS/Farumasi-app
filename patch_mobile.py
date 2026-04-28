import re

def update_file():
    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Chat bubble mobile
    old_chat = r"""                      child: IconButton\(
                        icon: const Icon\(
                          Icons\.chat_bubble_outline,
                          color: Color\(0xFF2E7D32\),
                        \),
                        onPressed: \(\) \{
                          Navigator\.push\(
                            context,
                            MaterialPageRoute\(
                              builder: \(_\) => const PharmacistChatScreen\(\),
                            \),
                          \);
                        \},
                      \),"""
    new_chat = """                      child: IconButton(
                        icon: const Icon(
                          Icons.chat_bubble_outline,
                          color: Color(0xFF2E7D32),
                        ),
                        onPressed: () {
                          setState(() {
                            _activeRightSidebar = _activeRightSidebar == 'consulting' ? null : 'consulting';
                          });
                        },
                      ),"""
    text = re.sub(old_chat, new_chat, text)

    # 2. Notifications mobile
    old_notif = r"""                      child: IconButton\(
                        icon: const Icon\(
                          Icons\.notifications_none_rounded,
                          color: Color\(0xFF2E7D32\),
                          size: 26,
                        \),
                        onPressed: \(\) \{
                          Navigator\.push\(
                            context,
                            MaterialPageRoute\(
                              builder: \(_\) => const PharmacistNotificationsScreen\(\),
                            \),
                          \);
                        \},
                      \),"""
    new_notif = """                      child: IconButton(
                        icon: const Icon(
                          Icons.notifications_none_rounded,
                          color: Color(0xFF2E7D32),
                          size: 26,
                        ),
                        onPressed: () {
                          setState(() {
                            _activeRightSidebar = _activeRightSidebar == 'notifications' ? null : 'notifications';
                          });
                        },
                      ),"""
    text = re.sub(old_notif, new_notif, text)

    with open('lib/screens/pharmacist/pharmacist_dashboard_screen.dart', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == '__main__':
    update_file()