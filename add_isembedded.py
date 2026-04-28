import re

def patch_file(path, class_name):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # check if it already has isEmbedded
    if 'isEmbedded' in text:
        print(f'{path} already has isEmbedded')
        return

    # Stateful replacement
    if 'extends StatefulWidget' in text:
        rep = f'class {class_name} extends StatefulWidget {{\n  final bool isEmbedded;\n  const {class_name}({{super.key, this.isEmbedded = false}});\n'
        text = re.sub(rf'class {class_name} extends StatefulWidget {{\n\s*const {class_name}\(\{{super\.key\}}\);', rep, text)
    else:
        rep = f'class {class_name} extends StatelessWidget {{\n  final bool isEmbedded;\n  const {class_name}({{super.key, this.isEmbedded = false}});\n'
        text = re.sub(rf'class {class_name} extends StatelessWidget {{\n\s*const {class_name}\(\{{super\.key\}}\);', rep, text)
        
    # Update Scaffold to hide AppBar if embedded
    # We find `appBar: AppBar(` and replace with `appBar: widget.isEmbedded ? null : AppBar(` in StatefulWidget, `isEmbedded` in Stateless
    if 'extends StatefulWidget' in text:
        text = text.replace('appBar: AppBar(', 'appBar: widget.isEmbedded ? null : AppBar(')
    else:
        text = text.replace('appBar: AppBar(', 'appBar: isEmbedded ? null : AppBar(')
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Patched {path}')

patch_file('lib/screens/pharmacist/settings/help_privacy_screen.dart', 'HelpCenterScreen')
patch_file('lib/screens/pharmacist/pharmacist_chat_screen.dart', 'PharmacistChatScreen')
patch_file('lib/screens/pharmacist/pharmacist_notifications_screen.dart', 'PharmacistNotificationsScreen')
