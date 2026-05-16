import re

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix QuillToolbar
old_toolbar = """          child: quill.QuillToolbar.simple(
            configurations: quill.QuillSimpleToolbarConfigurations(
              controller: _quillController,
              sharedConfigurations: const quill.QuillSharedConfigurations(
                locale: Locale('en'),
              ),
              showAlignmentButtons: true,
              showFontFamily: false,
              showFontSize: false,
              showClearFormat: false,
              showSearchButton: false,
              showCodeBlock: false,
              showInlineCode: false,
              showSuperscript: false,
              showSubscript: false,
            ),
          ),"""

new_toolbar = """          child: quill.QuillSimpleToolbar(
            controller: _quillController,
            config: const quill.QuillSimpleToolbarConfig(
              showFontFamily: false,
              showFontSize: false,
              showClearFormat: false,
              showSearchButton: false,
              showCodeBlock: false,
              showInlineCode: false,
              showSuperscript: false,
              showSubscript: false,
            ),
          ),"""

text = text.replace(old_toolbar, new_toolbar)


old_editor = """          child: quill.QuillEditor.basic(
            configurations: quill.QuillEditorConfigurations(
              controller: _quillController,
              sharedConfigurations: const quill.QuillSharedConfigurations(
                locale: Locale('en'),
              ),
            ),
          ),"""

new_editor = """          child: quill.QuillEditor.basic(
            controller: _quillController,
            config: const quill.QuillEditorConfig(),
          ),"""

text = text.replace(old_editor, new_editor)

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Patched Quill syntax for v11.5+')
