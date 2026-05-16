import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import 'dart:convert'; // For jsonDecode if needed

class PharmacistHealthPostsScreen extends StatefulWidget {
  const PharmacistHealthPostsScreen({super.key});

  @override
  State<PharmacistHealthPostsScreen> createState() =>
      _PharmacistHealthPostsScreenState();
}

class _PharmacistHealthPostsScreenState
    extends State<PharmacistHealthPostsScreen> {
  final Color _primaryGreen = const Color(0xFF1E9E68);
  bool _isCreatingPost = false;
  String? _editingPostId;

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _summaryController = TextEditingController();
  late quill.QuillController _quillController;

  String _selectedCategory = "General Tips";
  final List<String> _categories = [
    "General Tips",
    "Remedies",
    "SRH",
    "Mental Health",
    "Nutrition",
    "Mother & Babies",
    "Did You Know?",
  ];

  // List Management State
  String _searchQuery = "";
  String _filterCategory = "All";
  String _sortOption = "Newest";

  final List<Map<String, dynamic>> _posts = [
    {
      "id": "p1",
      "title": "Managing High Blood Pressure",
      "summary":
          "Tips on keeping your blood pressure under control and what to watch out for.",
      "category": "General Tips",
      "views": 1420,
      "date": "May 08, 2026",
      "status": "Published",
      "content":
          r'[{"insert":"Managing high blood pressure is very important.\\n"}]',
    },
    {
      "id": "p2",
      "title": "Mental Health During Winter",
      "summary": "How to handle seasonal affective changes safely at home.",
      "category": "Mental Health",
      "views": 850,
      "date": "May 05, 2026",
      "status": "Draft",
      "content": r'[{"insert":"Winter can be tough!\\n"}]',
    },
    {
      "id": "p3",
      "title": "Essential Vitamins for Pregnancy",
      "summary": "What vitamins you should prioritize while pregnant.",
      "category": "Mother & Babies",
      "views": 2100,
      "date": "May 02, 2026",
      "status": "Published",
      "content": r'[{"insert":"Folic acid is key.\\n"}]',
    },
  ];

  @override
  void initState() {
    super.initState();
    _initQuill();
  }

  void _initQuill([String? docJson]) {
    if (docJson != null && docJson.isNotEmpty) {
      try {
        final doc = quill.Document.fromJson(jsonDecode(docJson));
        _quillController = quill.QuillController(
          document: doc,
          selection: const TextSelection.collapsed(offset: 0),
        );
        return;
      } catch (e) {
        // ignore
      }
    }
    _quillController = quill.QuillController.basic();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _summaryController.dispose();
    _quillController.dispose();
    super.dispose();
  }

  void _openComposer({Map<String, dynamic>? post}) {
    if (post != null) {
      _titleController.text = post['title'];
      _summaryController.text = post['summary'];
      _selectedCategory = post['category'];
      _editingPostId = post['id'];
      _initQuill(post['content']);
    } else {
      _titleController.clear();
      _summaryController.clear();
      _selectedCategory = "General Tips";
      _editingPostId = null;
      _initQuill();
    }
    setState(() {
      _isCreatingPost = true;
    });
  }

  void _savePost(String status) {
    if (_titleController.text.isEmpty) return;

    final contentJson = jsonEncode(
      _quillController.document.toDelta().toJson(),
    );

    setState(() {
      if (_editingPostId != null) {
        final idx = _posts.indexWhere((p) => p['id'] == _editingPostId);
        if (idx != -1) {
          _posts[idx] = {
            ..._posts[idx],
            "title": _titleController.text,
            "summary": _summaryController.text.isNotEmpty
                ? _summaryController.text
                : "No summary provided.",
            "category": _selectedCategory,
            "status": status,
            "content": contentJson,
          };
        }
      } else {
        _posts.insert(0, {
          "id": "p_${DateTime.now().millisecondsSinceEpoch}",
          "title": _titleController.text,
          "summary": _summaryController.text.isNotEmpty
              ? _summaryController.text
              : "No summary provided.",
          "category": _selectedCategory,
          "views": 0,
          "date": "Today",
          "status": status,
          "content": contentJson,
        });
      }

      _isCreatingPost = false;
      _editingPostId = null;
    });
  }

  void _deletePost(String id) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Delete Post"),
        content: const Text(
          "Are you sure you want to permanently delete this health article?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _posts.removeWhere((p) => p['id'] == id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    "Post deleted",
                    style: TextStyle(color: Colors.white),
                  ),
                  backgroundColor: Colors.black87,
                ),
              );
            },
            child: const Text("Delete", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _viewPost(Map<String, dynamic> post) {
    quill.Document doc;
    try {
      doc = quill.Document.fromJson(jsonDecode(post['content']));
    } catch (e) {
      doc = quill.Document()..insert(0, "Error loading content.");
    }

    final readOnlyController = quill.QuillController(
      document: doc,
      selection: const TextSelection.collapsed(offset: 0),
      readOnly: true,
    );

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            width: 800,
            height: 600,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        post['title'],
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _primaryGreen.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        post['category'],
                        style: TextStyle(
                          color: _primaryGreen,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      post['date'],
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(),
                const SizedBox(height: 16),
                Expanded(
                  child: quill.QuillEditor.basic(
                    controller: readOnlyController,
                    config: const quill.QuillEditorConfig(
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<Map<String, dynamic>> get _filteredPosts {
    List<Map<String, dynamic>> res = _posts.where((p) {
      final matchesSearch =
          p['title'].toString().toLowerCase().contains(
            _searchQuery.toLowerCase(),
          ) ||
          p['summary'].toString().toLowerCase().contains(
            _searchQuery.toLowerCase(),
          );
      final matchesCat =
          _filterCategory == "All" || p['category'] == _filterCategory;
      return matchesSearch && matchesCat;
    }).toList();

    if (_sortOption == "Newest") {
      // Dummy sort, since dates are strings, rely on index as they are appended at top
    } else if (_sortOption == "Most Viewed") {
      res.sort((a, b) => (b['views'] as int).compareTo(a['views'] as int));
    }
    return res;
  }

  @override
  Widget build(BuildContext context) {
    if (_isCreatingPost) {
      return _buildComposer();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Health Center",
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Publish medical tips and wellness articles",
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _openComposer(),
                icon: const Icon(Icons.mode_edit_outline, size: 18),
                label: const Text(
                  "Write Article",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryGreen,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Filters Strip
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          color: Colors.grey.shade50,
          child: Row(
            children: [
              // Search
              Expanded(
                flex: 3,
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: TextField(
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: const TextStyle(fontSize: 14),
                    decoration: const InputDecoration(
                      hintText: "Search articles...",
                      prefixIcon: Icon(
                        Icons.search,
                        size: 20,
                        color: Colors.grey,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Category Filter
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _filterCategory,
                    hint: const Text("Category"),
                    icon: const Icon(
                      Icons.keyboard_arrow_down,
                      size: 20,
                      color: Colors.grey,
                    ),
                    items: ["All", ..._categories]
                        .map(
                          (c) => DropdownMenuItem(
                            value: c,
                            child: Text(
                              c,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _filterCategory = val);
                    },
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Sort Filter
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _sortOption,
                    icon: const Icon(Icons.sort, size: 20, color: Colors.grey),
                    items: ["Newest", "Most Viewed"]
                        .map(
                          (c) => DropdownMenuItem(
                            value: c,
                            child: Text(
                              c,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _sortOption = val);
                    },
                  ),
                ),
              ),
            ],
          ),
        ),

        // Post Grid / List
        Expanded(
          child: _filteredPosts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.article_outlined,
                        size: 64,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "No articles found.",
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(24),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 400,
                    mainAxisExtent: 240,
                    crossAxisSpacing: 24,
                    mainAxisSpacing: 24,
                  ),
                  itemCount: _filteredPosts.length,
                  itemBuilder: (context, index) {
                    final post = _filteredPosts[index];
                    final isPublished = post['status'] == 'Published';
                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => _viewPost(post),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Post Top Half
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: _primaryGreen.withValues(
                                              alpha: 0.1,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              6,
                                            ),
                                          ),
                                          child: Text(
                                            post['category'],
                                            style: TextStyle(
                                              color: _primaryGreen,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isPublished
                                                ? Colors.green.shade50
                                                : Colors.amber.shade50,
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                          child: Text(
                                            post['status'],
                                            style: TextStyle(
                                              color: isPublished
                                                  ? Colors.green.shade700
                                                  : Colors.amber.shade700,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 14),
                                    Text(
                                      post['title'],
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.black87,
                                        height: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Expanded(
                                      child: Text(
                                        post['summary'],
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey.shade600,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            // Post Bottom Actions
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                border: Border(
                                  top: BorderSide(color: Colors.grey.shade100),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.remove_red_eye,
                                    size: 14,
                                    color: Colors.grey.shade500,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    "${post['views']}",
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    post['date'],
                                    style: TextStyle(
                                      color: Colors.grey.shade500,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Actions
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(
                                          Icons.edit_outlined,
                                          size: 18,
                                        ),
                                        color: Colors.grey.shade700,
                                        tooltip: "Edit",
                                        constraints: const BoxConstraints(),
                                        padding: const EdgeInsets.all(8),
                                        onPressed: () =>
                                            _openComposer(post: post),
                                      ),
                                      IconButton(
                                        icon: const Icon(
                                          Icons.delete_outline,
                                          size: 18,
                                        ),
                                        color: Colors.red.shade400,
                                        tooltip: "Delete",
                                        constraints: const BoxConstraints(),
                                        padding: const EdgeInsets.all(8),
                                        onPressed: () =>
                                            _deletePost(post['id']),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildComposer() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() {
                  _isCreatingPost = false;
                  _editingPostId = null;
                }),
                color: Colors.black87,
              ),
              const SizedBox(width: 8),
              Text(
                _editingPostId != null ? "Edit Article" : "New Article",
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _savePost("Draft"),
                icon: const Icon(Icons.save_outlined, size: 18),
                label: const Text("Save Draft"),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.grey.shade700,
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: () => _savePost("Published"),
                icon: const Icon(Icons.send, size: 16),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryGreen,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                label: Text(
                  _editingPostId != null ? "Update" : "Publish",
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
        Expanded(
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
                      width: 340,
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
            },
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
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w900,
            color: Colors.black87,
          ),
          decoration: const InputDecoration(
            hintText: "Article Title...",
            hintStyle: TextStyle(color: Colors.black12),
            border: InputBorder.none,
          ),
          maxLines: null,
        ),
        const SizedBox(height: 24),
        Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(8),
            color: Colors.grey.shade50,
          ),
          child: quill.QuillSimpleToolbar(
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
          ),
        ),
        Container(
          height: 600, // Rich text viewport
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(12),
            color: Colors.white,
          ),
          child: quill.QuillEditor.basic(
            controller: _quillController,
            config: const quill.QuillEditorConfig(),
          ),
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
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          "Category",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
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
              items: _categories
                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                  .toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedCategory = val);
              },
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          "Short Summary",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _summaryController,
          maxLines: 4,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: "A brief preview of the article...",
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: const Color(0xFF1E9E68)),
            ),
            fillColor: Colors.white,
            filled: true,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          "Cover Image",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Container(
          height: 140,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.grey.shade300,
              style: BorderStyle.solid,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.cloud_upload_outlined,
                  color: Colors.grey.shade600,
                  size: 28,
                ),
              ),
              const SizedBox(height: 12),
              RichText(
                text: TextSpan(
                  text: 'Click to upload',
                  style: TextStyle(
                    color: _primaryGreen,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  children: [
                    TextSpan(
                      text: ' or drag and drop',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "SVG, PNG, JPG or GIF (max. 800x400px)",
                style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
