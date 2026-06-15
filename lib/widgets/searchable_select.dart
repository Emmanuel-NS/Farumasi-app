import 'package:flutter/material.dart';

/// Mirrors patient portal `SearchableSelect` for Kigali neighbourhood picking.
class SearchableSelect extends StatefulWidget {
  const SearchableSelect({
    super.key,
    required this.value,
    required this.onChanged,
    required this.options,
    this.placeholder = 'Search…',
    this.disabled = false,
    this.emptyLabel = 'No matches',
    this.allowCustom = false,
    this.customMinLength = 2,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final List<String> options;
  final String placeholder;
  final bool disabled;
  final String emptyLabel;
  final bool allowCustom;
  final int customMinLength;

  @override
  State<SearchableSelect> createState() => _SearchableSelectState();
}

class _SearchableSelectState extends State<SearchableSelect> {
  final _focusNode = FocusNode();
  final _controller = TextEditingController();
  final _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  bool _open = false;

  @override
  void initState() {
    super.initState();
    _controller.text = widget.value;
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void didUpdateWidget(SearchableSelect oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_open && oldWidget.value != widget.value) {
      _controller.text = widget.value;
    }
  }

  @override
  void dispose() {
    _removeOverlay();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus && !widget.disabled) {
      _openDropdown();
    }
  }

  List<String> get _filtered {
    final q = _controller.text.trim().toLowerCase();
    if (q.isEmpty) return widget.options;
    return widget.options.where((o) => o.toLowerCase().contains(q)).toList();
  }

  bool get _showCustom {
    final trimmed = _controller.text.trim();
    if (!widget.allowCustom || trimmed.length < widget.customMinLength) {
      return false;
    }
    return !widget.options.any((o) => o.toLowerCase() == trimmed.toLowerCase());
  }

  void _pick(String next) {
    widget.onChanged(next);
    _controller.text = next;
    _closeDropdown();
    _focusNode.unfocus();
  }

  void _openDropdown() {
    if (widget.disabled || _open) return;
    setState(() => _open = true);
    _overlayEntry = _buildOverlay();
    Overlay.of(context).insert(_overlayEntry!);
  }

  void _closeDropdown() {
    if (!_open) return;
    setState(() => _open = false);
    _removeOverlay();
    if (!widget.disabled) _controller.text = widget.value;
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  OverlayEntry _buildOverlay() {
    final renderBox = context.findRenderObject() as RenderBox?;
    final width = renderBox?.size.width ?? 300;

    return OverlayEntry(
      builder: (ctx) => Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              onTap: _closeDropdown,
              behavior: HitTestBehavior.translucent,
              child: const ColoredBox(color: Colors.transparent),
            ),
          ),
          CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            offset: const Offset(0, 48),
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: width,
                constraints: const BoxConstraints(maxHeight: 220),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  shrinkWrap: true,
                  children: [
                    if (_showCustom)
                      ListTile(
                        dense: true,
                        leading: const Icon(Icons.add, size: 18, color: Color(0xFF1E9E68)),
                        title: Text(
                          'Use "${_controller.text.trim()}"',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1E9E68),
                            fontSize: 13,
                          ),
                        ),
                        onTap: () => _pick(_controller.text.trim()),
                      ),
                    if (_filtered.isEmpty && !_showCustom)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          widget.emptyLabel,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      )
                    else
                      ..._filtered.map(
                        (opt) => ListTile(
                          dense: true,
                          title: Text(
                            opt,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: widget.value == opt ? FontWeight.bold : FontWeight.normal,
                              color: widget.value == opt
                                  ? const Color(0xFF1E9E68)
                                  : const Color(0xFF334155),
                            ),
                          ),
                          tileColor: widget.value == opt
                              ? const Color(0xFFEDFDF6)
                              : null,
                          onTap: () => _pick(opt),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: widget.disabled ? const Color(0xFFF8FAFC) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _focusNode.hasFocus ? const Color(0xFF1E9E68) : const Color(0xFFE2E8F0),
            width: _focusNode.hasFocus ? 2 : 1,
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: [
            Icon(
              Icons.search,
              size: 18,
              color: widget.disabled ? const Color(0xFFCBD5E1) : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                enabled: !widget.disabled,
                style: const TextStyle(fontSize: 14, color: Color(0xFF1E293B)),
                decoration: InputDecoration(
                  isDense: true,
                  border: InputBorder.none,
                  hintText: widget.placeholder,
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                ),
                onChanged: (_) {
                  if (!_open) _openDropdown();
                  _overlayEntry?.markNeedsBuild();
                  setState(() {});
                },
                onTap: () {
                  if (!widget.disabled) _openDropdown();
                },
              ),
            ),
            IconButton(
              icon: Icon(
                _open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                color: const Color(0xFF94A3B8),
                size: 20,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              onPressed: widget.disabled
                  ? null
                  : () {
                      if (_open) {
                        _closeDropdown();
                      } else {
                        _focusNode.requestFocus();
                        _openDropdown();
                      }
                    },
            ),
          ],
        ),
      ),
    );
  }
}
