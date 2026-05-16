import re

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'r', encoding='utf-8') as f:
    text = f.read()

responsive_row = """        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth > 800;
              if (isDesktop) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Main Editor
                    Expanded(
                      flex: 2,
                      child: Container(
                        color: Colors.white,
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(32),
                          child: _buildEditorContent(),
                        ),
                      ),
                    ),
                    // Meta Sidebar
                    Container(
                      width: 320,
                      color: Colors.grey.shade50,
                      padding: const EdgeInsets.all(24),
                      child: SingleChildScrollView(child: _buildMetaSidebar()),
                    ),
                  ],
                );
              }
              // Mobile View
              return SingleChildScrollView(
                child: Column(
                  children: [
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.all(20),
                      child: _buildEditorContent(),
                    ),
                    Container(
                      color: Colors.grey.shade50,
                      padding: const EdgeInsets.all(20),
                      child: _buildMetaSidebar(),
                    ),
                  ],
                ),
              );
            }
          ),
        ),
      ],
    );
  }

  Widget _buildEditorContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _titleController,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
          decoration: const InputDecoration(
            hintText: "Article Title...",
            hintStyle: TextStyle(color: Colors.black26),
            border: InputBorder.none,
          ),
          maxLines: null,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _contentController,
          style: TextStyle(fontSize: 16, color: Colors.grey.shade800, height: 1.6),
          decoration: const InputDecoration(
            hintText: "Write your medical advice or update here...\\nSupports markdown formatting.",
            hintStyle: TextStyle(color: Colors.black26),
            border: InputBorder.none,
          ),
          maxLines: null,
        ),
      ],
    );
  }

  Widget _buildMetaSidebar() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          "Publishing Settings",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87),
        ),
        const SizedBox(height: 24),
        const Text("Category", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedCategory,
              isExpanded: true,
              items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedCategory = val);
              },
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text("Short Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: _summaryController,
          maxLines: 4,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: "A brief preview of the article...",
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: const Color(0xFF1E9E68))),
            fillColor: Colors.white,
            filled: true,
          ),
        ),
        const SizedBox(height: 24),
        const Text("Cover Image", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Container(
          height: 120,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.add_photo_alternate, color: Colors.grey.shade400, size: 32),
              const SizedBox(height: 8),
              Text("Click to browse", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}
"""

search = """        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Main Editor
              Expanded(
                flex: 2,
                child: Container(
                  color: Colors.white,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _titleController,
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.black87),
                          decoration: const InputDecoration(
                            hintText: "Article Title...",
                            hintStyle: TextStyle(color: Colors.black26),
                            border: InputBorder.none,
                          ),
                          maxLines: null,
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _contentController,
                          style: TextStyle(fontSize: 16, color: Colors.grey.shade800, height: 1.6),
                          decoration: const InputDecoration(
                            hintText: "Write your medical advice or update here...\\nSupports markdown formatting.",
                            hintStyle: TextStyle(color: Colors.black26),
                            border: InputBorder.none,
                          ),
                          maxLines: null,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // Meta Sidebar
              Container(
                width: 320,
                color: Colors.grey.shade50,
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "Publishing Settings",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87),
                    ),
                    const SizedBox(height: 24),
                    const Text("Category", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedCategory,
                          isExpanded: true,
                          items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedCategory = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text("Short Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _summaryController,
                      maxLines: 4,
                      style: const TextStyle(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: "A brief preview of the article...",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Colors.grey.shade300)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: _primaryGreen)),
                        fillColor: Colors.white,
                        filled: true,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text("Cover Image", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Container(
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_photo_alternate, color: Colors.grey.shade400, size: 32),
                          const SizedBox(height: 8),
                          Text("Click to browse", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}"""

if search in text:
    text = text.replace(search, responsive_row)
else:
    print("Oops responsive patch didn't match. doing fuzzy.")
    pos1 = text.find('        Expanded(\n          child: Row(')
    pos2 = text.find('}\n}', pos1)
    if pos1 != -1 and pos2 != -1:
        text = text[:pos1] + responsive_row + text[pos2+2:]

with open('lib/screens/pharmacist/pharmacist_health_posts_screen.dart', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied responsive health posts")
