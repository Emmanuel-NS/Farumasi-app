import re

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

# Add flutter_quill import
if "import 'package:flutter_quill/flutter_quill.dart'" not in text:
    text = text.replace("import 'package:flutter/material.dart';", "import 'package:flutter/material.dart';\nimport 'package:flutter_quill/flutter_quill.dart' as quill;")

# Replace disposing mechanics
text = text.replace("final TextEditingController _contentController = TextEditingController();", "")
text = text.replace("_contentController.dispose();", "_quillController.dispose();")

if "final quill.QuillController _quillController = quill.QuillController.basic();" not in text:
    text = text.replace("final TextEditingController _summaryController = TextEditingController();", "final TextEditingController _summaryController = TextEditingController();\n  final quill.QuillController _quillController = quill.QuillController.basic();")

# Update Categories to match frontend
old_cat = """  String _selectedCategory = "General Health";
  final List<String> _categories = [
    "General Health",
    "Nutrition",
    "Mental Health",
    "Mother & Babies",
    "Remedies",
  ];"""
new_cat = """  String _selectedCategory = "General Tips";
  final List<String> _categories = [
    "General Tips",
    "Remedies",
    "SRH",
    "Mental Health",
    "Nutrition",
    "Mother & Babies",
    "Did You Know?",
  ];"""
text = text.replace(old_cat, new_cat)

# Add quill rendering
old_content = """        TextField(
          controller: _contentController,
          style: TextStyle(fontSize: 16, color: Colors.grey.shade800, height: 1.6),
          decoration: const InputDecoration(
            hintText: "Write your medical advice or update here...\\nSupports markdown formatting.",
            hintStyle: TextStyle(color: Colors.black26),
            border: InputBorder.none,
          ),
          maxLines: null,
        ),"""
new_content = """        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
            color: Colors.grey.shade50,
          ),
          child: quill.QuillToolbar.simple(
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
          ),
        ),
        Container(
          height: 500, // Rich text viewport
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
          ),
          child: quill.QuillEditor.basic(
            configurations: quill.QuillEditorConfigurations(
              controller: _quillController,
              sharedConfigurations: const quill.QuillSharedConfigurations(
                locale: Locale('en'),
              ),
            ),
          ),
        ),"""

text = text.replace(old_content, new_content)

text = text.replace('if (_titleController.text.isEmpty || _contentController.text.isEmpty) return;', 'if (_titleController.text.isEmpty || _quillController.document.isEmpty()) return;')
text = text.replace('_contentController.clear();', '_quillController.clear();')


with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print('Patched with Quill properly bounded')
