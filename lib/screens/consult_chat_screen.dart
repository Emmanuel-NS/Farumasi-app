import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../api/repositories/patient_repository.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../widgets/portal/portal_ui.dart';

class ConsultChatScreen extends ConsumerStatefulWidget {
  const ConsultChatScreen({super.key});

  @override
  ConsumerState<ConsultChatScreen> createState() => _ConsultChatScreenState();
}

class _ConsultChatScreenState extends ConsumerState<ConsultChatScreen> with WidgetsBindingObserver {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  List<PatientPharmacist> _pharmacists = [];
  List<PatientConsultation> _consultations = [];
  PatientPharmacist? _selectedPh;
  PatientConsultation? _activeConsult;
  bool _loadingList = true;
  bool _loadingChat = false;
  bool _sending = false;
  String _filter = 'all';
  String _search = '';
  bool _isAnonymous = false;
  bool _attachMenuOpen = false;
  String? _pendingAttachmentUrl;
  String? _pendingAttachmentName;
  String? _pendingAttachmentType;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final myId = ref.read(authProvider).user?.id;
    try {
      final results = await Future.wait([
        PatientRepository.instance.fetchPharmacists(),
        PatientRepository.instance.fetchConsultations(myUserId: myId),
      ]);
      if (!mounted) return;
      setState(() {
        _pharmacists = results[0] as List<PatientPharmacist>;
        _consultations = results[1] as List<PatientConsultation>;
        _loadingList = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingList = false);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _activeConsult != null) {
      _refreshChat();
      _startPolling();
    } else if (state == AppLifecycleState.paused) {
      _pollTimer?.cancel();
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _refreshChat());
  }

  Future<void> _refreshChat() async {
    final consult = _activeConsult;
    if (consult == null) return;
    final myId = ref.read(authProvider).user?.id;
    try {
      final fresh = await PatientRepository.instance.fetchConsultation(
        consult.id,
        myUserId: myId,
      );
      if (!mounted) return;
      setState(() => _activeConsult = fresh);
      await PatientRepository.instance.markConsultMessagesRead(consult.id);
      _scrollToBottom();
    } catch (_) {}
  }

  String _threadKey(String pharmacistId, bool anon) => '$pharmacistId|${anon ? 1 : 0}';

  PatientPharmacist? _pharmacistById(String id) {
    try {
      return _pharmacists.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  List<_ConsultRailEntry> get _railEntries {
    final entries = <_ConsultRailEntry>[];
    final seen = <String>{};

    for (final c in _consultations) {
      final pharmacistId = c.pharmacistId;
      if (pharmacistId == null || pharmacistId.isEmpty) continue;
      final ph = _pharmacistById(pharmacistId);
      if (ph == null) continue;
      final key = _threadKey(ph.id, c.isAnonymous);
      if (seen.add(key)) {
        entries.add(_ConsultRailEntry(pharmacist: ph, isAnonymous: c.isAnonymous, consultation: c));
      }
    }

    for (final ph in _pharmacists) {
      final key = _threadKey(ph.id, false);
      if (seen.add(key)) {
        entries.add(_ConsultRailEntry(pharmacist: ph, isAnonymous: false));
      }
    }

    entries.sort((a, b) {
      final ta = a.consultation?.messages.lastOrNull?.createdAt;
      final tb = b.consultation?.messages.lastOrNull?.createdAt;
      if (ta != null && tb != null) return tb.compareTo(ta);
      if (ta != null) return -1;
      if (tb != null) return 1;
      if (a.pharmacist.status == 'available' && b.pharmacist.status != 'available') return -1;
      if (b.pharmacist.status == 'available' && a.pharmacist.status != 'available') return 1;
      return a.pharmacist.name.compareTo(b.pharmacist.name);
    });
    return entries;
  }

  List<_ConsultRailEntry> get _filteredRailEntries {
    final q = _search.trim().toLowerCase();
    return _railEntries.where((entry) {
      final ph = entry.pharmacist;
      final matchQ = q.isEmpty ||
          ph.name.toLowerCase().contains(q) ||
          ph.specialty.toLowerCase().contains(q);
      final matchF = _filter == 'all' ||
          (_filter == 'available' && ph.status == 'available') ||
          (_filter == 'chats' && entry.consultation != null);
      return matchQ && matchF;
    }).toList();
  }

  int get _threadCount => _consultations
      .where((c) => c.pharmacistId != null && c.pharmacistId!.isNotEmpty)
      .map((c) => _threadKey(c.pharmacistId!, c.isAnonymous))
      .toSet()
      .length;

  PatientConsultation? _consultFor(String pharmacistId, {bool? anon}) {
    try {
      return _consultations.firstWhere((c) {
        if (c.pharmacistId != pharmacistId) return false;
        if (anon != null) return c.isAnonymous == anon;
        return true;
      });
    } catch (_) {
      return null;
    }
  }

  Future<void> _openPharmacist(PatientPharmacist ph, {bool? anon}) async {
    final useAnon = anon ?? _isAnonymous;
    setState(() {
      _selectedPh = ph;
      _isAnonymous = useAnon;
      _loadingChat = true;
    });
    final myId = ref.read(authProvider).user?.id;
    final existing = _consultFor(ph.id, anon: useAnon);
    if (existing != null) {
      try {
        final loaded = await PatientRepository.instance.fetchConsultation(
          existing.id,
          myUserId: myId,
        );
        if (!mounted) return;
        setState(() {
          _consultations = [
            for (final c in _consultations)
              if (c.id == loaded.id) loaded else c,
          ];
          _activeConsult = loaded;
          _loadingChat = false;
        });
        await PatientRepository.instance.markConsultMessagesRead(loaded.id);
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _activeConsult = existing;
          _loadingChat = false;
        });
      }
      _startPolling();
      _scrollToBottom();
      return;
    }
    try {
      final created = await PatientRepository.instance.createConsultation(
        pharmacistId: ph.id,
        isAnonymous: useAnon,
      );
      final loaded = await PatientRepository.instance.fetchConsultation(
        created.id,
        myUserId: myId,
      );
      if (!mounted) return;
      setState(() {
        _consultations = [..._consultations, loaded];
        _activeConsult = loaded;
        _loadingChat = false;
      });
      _startPolling();
    } catch (e) {
      if (mounted) {
        setState(() => _loadingChat = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not start chat: $e')),
        );
      }
    }
  }

  Future<void> _toggleAnonymous() async {
    final ph = _selectedPh;
    if (ph == null) return;
    await _openPharmacist(ph, anon: !_isAnonymous);
  }

  void _showProfile(PatientPharmacist ph) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(ctx).size.height * 0.55,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: CircleAvatar(
                radius: 36,
                backgroundColor: PortalColors.greenLight,
                child: Text(
                  ph.name.isNotEmpty ? ph.name[0].toUpperCase() : 'P',
                  style: const TextStyle(fontSize: 24, color: PortalColors.green),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(ph.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            Center(child: Text(ph.specialty, style: const TextStyle(color: PortalColors.slate500))),
            const SizedBox(height: 8),
            Center(
              child: PortalStatusBadge(
                label: ph.status == 'available' ? 'Available now' : ph.status == 'busy' ? 'Busy' : 'Offline',
                tone: ph.status == 'available' ? PortalStatusTone.success : PortalStatusTone.neutral,
              ),
            ),
            const SizedBox(height: 20),
            const Text('About', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              'Licensed pharmacist available for general medication advice.',
              style: const TextStyle(color: PortalColors.slate600, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    setState(() => _attachMenuOpen = false);
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    try {
      final url = await PatientRepository.instance.uploadConsultImage(file.path);
      setState(() {
        _pendingAttachmentUrl = url;
        _pendingAttachmentName = file.name;
        _pendingAttachmentType = 'image';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    }
  }

  Future<void> _pickProduct() async {
    setState(() => _attachMenuOpen = false);
    final picked = await showModalBottomSheet<Medicine>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ConsultProductPicker(
        onPick: (m) => Navigator.pop(ctx, m),
      ),
    );
    if (picked == null || !mounted) return;
    final url = PatientRepository.resolveMediaUrl(picked.imageUrl);
    setState(() {
      _pendingAttachmentUrl = url.isNotEmpty ? url : null;
      _pendingAttachmentName = picked.name;
      _pendingAttachmentType = 'product';
    });
    if (_input.text.isEmpty) {
      _input.text = 'Product: ${picked.name}';
    }
  }

  Future<void> _pickDocument() async {
    setState(() => _attachMenuOpen = false);
    final result = await FilePicker.platform.pickFiles(withData: false);
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.path == null) return;
    try {
      final url = await PatientRepository.instance.uploadConsultDocument(file.path!);
      setState(() {
        _pendingAttachmentUrl = url;
        _pendingAttachmentName = file.name;
        _pendingAttachmentType = 'file';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _input.text.trim();
    final consult = _activeConsult;
    if ((text.isEmpty && _pendingAttachmentUrl == null) || consult == null || _sending) return;
    if (consult.status != 'open') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This consultation is closed.')),
      );
      return;
    }
    setState(() => _sending = true);
    final attachmentUrl = _pendingAttachmentUrl;
    final attachmentName = _pendingAttachmentName;
    final attachmentType = _pendingAttachmentType;
    _input.clear();
    setState(() {
      _pendingAttachmentUrl = null;
      _pendingAttachmentName = null;
      _pendingAttachmentType = null;
    });
    try {
      await PatientRepository.instance.sendConsultMessage(
        consult.id,
        text.isEmpty ? (attachmentName ?? 'Attachment') : text,
        attachmentUrl: attachmentUrl,
        attachmentName: attachmentName,
        attachmentType: attachmentType,
        attachmentSize: 0,
      );
      await _refreshChat();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Send failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _previewForEntry(_ConsultRailEntry entry) {
    final consult = entry.consultation;
    if (consult == null) return entry.pharmacist.specialty;
    final last = consult.messages.lastOrNull;
    if (last == null) return entry.pharmacist.specialty;
    if (last.attachmentType == 'image') return '📷 Photo';
    if (last.attachmentType == 'file') return '📎 ${last.attachmentName ?? 'File'}';
    return last.content.isNotEmpty ? last.content : entry.pharmacist.specialty;
  }

  String _timeForEntry(_ConsultRailEntry entry) {
    final t = entry.consultation?.messages.lastOrNull?.createdAt;
    if (t == null) return '';
    return portalRelativeTime(t);
  }

  int _unreadForEntry(_ConsultRailEntry entry) {
    final consult = entry.consultation;
    if (consult == null) return 0;
    return consult.messages.where((m) => !m.isFromPatient && !m.isRead).length;
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'available':
        return PortalColors.green;
      case 'busy':
        return const Color(0xFFFBBF24);
      default:
        return PortalColors.slate300;
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width >= 720;
    return SizedBox.expand(
      child: ColoredBox(
        color: PortalColors.pageBg,
        child: wide
            ? Row(
                children: [
                  SizedBox(width: 340, child: _buildRail(showBack: false)),
                  const VerticalDivider(width: 1, color: PortalColors.slate200),
                  Expanded(child: _buildChatPane()),
                ],
              )
            : _selectedPh == null
                ? _buildRail(showBack: false)
                : _buildChatPane(showBack: true),
      ),
    );
  }

  Widget _buildRail({required bool showBack}) {
    if (_loadingList) {
      return const Center(
        child: CircularProgressIndicator(color: PortalColors.green),
      );
    }

    final availableCount = _pharmacists.where((p) => p.status == 'available').length;

    return ColoredBox(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Consult a Pharmacist',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: PortalColors.slate900,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Chat with licensed pharmacists for advice',
                  style: TextStyle(fontSize: 12, color: PortalColors.slate500),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search pharmacists…',
                hintStyle: const TextStyle(fontSize: 14, color: PortalColors.slate400),
                prefixIcon: const Icon(Icons.search, size: 20, color: PortalColors.slate400),
                filled: true,
                fillColor: PortalColors.slate100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _filterChip('all', 'All (${_pharmacists.length})'),
                _filterChip('available', 'Available ($availableCount)'),
                _filterChip('chats', 'Chats ($_threadCount)'),
              ],
            ),
          ),
          const Divider(height: 1, color: PortalColors.slate100),
          Expanded(
            child: _filteredRailEntries.isEmpty
                ? const PortalEmptyState(
                    icon: Icons.search_off,
                    message: 'No pharmacists found',
                  )
                : ListView.builder(
                    itemCount: _filteredRailEntries.length,
                    itemBuilder: (context, i) {
                      final entry = _filteredRailEntries[i];
                      final ph = entry.pharmacist;
                      final selected = _selectedPh?.id == ph.id && _isAnonymous == entry.isAnonymous;
                      final preview = _previewForEntry(entry);
                      final timeLabel = _timeForEntry(entry);
                      final unread = _unreadForEntry(entry);
                      return Material(
                        color: selected ? PortalColors.greenLight : Colors.white,
                        child: InkWell(
                          onTap: () => _openPharmacist(ph, anon: entry.isAnonymous),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    CircleAvatar(
                                      radius: 24,
                                      backgroundColor: PortalColors.greenLight,
                                      child: Text(
                                        ph.name.isNotEmpty
                                            ? ph.name[0].toUpperCase()
                                            : 'P',
                                        style: const TextStyle(
                                          color: PortalColors.green,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      right: 0,
                                      bottom: 0,
                                      child: Container(
                                        width: 12,
                                        height: 12,
                                        decoration: BoxDecoration(
                                          color: _statusColor(ph.status),
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Flexible(
                                                  child: Text(
                                                    entry.isAnonymous ? 'Anonymous chat' : ph.name,
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.w700,
                                                      fontSize: 14,
                                                      color: PortalColors.slate900,
                                                    ),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                if (entry.isAnonymous) ...[
                                                  const SizedBox(width: 6),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: PortalColors.slate800,
                                                      borderRadius: BorderRadius.circular(999),
                                                    ),
                                                    child: const Text(
                                                      'ANON',
                                                      style: TextStyle(
                                                        fontSize: 9,
                                                        fontWeight: FontWeight.w800,
                                                        color: Colors.white,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          if (timeLabel.isNotEmpty)
                                            Text(
                                              timeLabel,
                                              style: const TextStyle(
                                                fontSize: 10,
                                                color: PortalColors.slate400,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        preview,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: PortalColors.slate500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (unread > 0) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: PortalColors.green,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      '$unread',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String key, String label) {
    final selected = _filter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: GestureDetector(
        onTap: () => setState(() => _filter = key),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: selected ? PortalColors.green : PortalColors.slate100,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : PortalColors.slate600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChatPane({bool showBack = false}) {
    final ph = _selectedPh;
    if (ph == null) {
      return ColoredBox(
        color: PortalColors.pageBg,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: PortalColors.greenLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.chat_bubble_outline,
                  size: 36,
                  color: PortalColors.green,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Pick a pharmacist to start chatting',
                style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate800),
              ),
              const SizedBox(height: 8),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Medical advice only — not a substitute for emergency care.',
                  style: TextStyle(color: PortalColors.slate500, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final messages = _activeConsult?.messages ?? [];

    return Column(
      children: [
        Container(
          color: _isAnonymous ? PortalColors.slate900 : PortalColors.green,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          child: Row(
            children: [
              if (showBack)
                IconButton(
                  onPressed: () {
                    _pollTimer?.cancel();
                    setState(() {
                      _selectedPh = null;
                      _activeConsult = null;
                    });
                  },
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                ),
              GestureDetector(
                onTap: () => _showProfile(ph),
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: Colors.white24,
                  child: Text(
                    ph.name.isNotEmpty ? ph.name[0].toUpperCase() : 'P',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isAnonymous ? 'Anonymous Patient' : ph.name,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      _isAnonymous ? 'Anonymous mode · ${ph.specialty}' : ph.specialty,
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: _toggleAnonymous,
                style: TextButton.styleFrom(foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_isAnonymous ? Icons.visibility_off : Icons.visibility, size: 16, color: Colors.white),
                    const SizedBox(width: 4),
                    Text(_isAnonymous ? 'Anon' : 'Normal', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => _showProfile(ph),
                icon: const Icon(Icons.info_outline, color: Colors.white),
              ),
            ],
          ),
        ),
        if (_isAnonymous)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: PortalColors.slate800,
            child: const Text(
              'Anonymous mode: the pharmacist sees you as Anonymous Patient. Messages are kept in a separate thread.',
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ),
        Expanded(
          child: Container(
            color: const Color(0xFFECE5DD),
            child: _loadingChat
                ? const Center(
                    child: CircularProgressIndicator(color: PortalColors.green),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: messages.length + 1,
                    itemBuilder: (context, i) {
                      if (i == 0) {
                        return Center(
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text(
                              'Medical advice only — not for emergencies.',
                              style: TextStyle(fontSize: 11, color: PortalColors.slate600),
                            ),
                          ),
                        );
                      }
                      return _messageBubble(messages[i - 1]);
                    },
                  ),
          ),
        ),
        if (_activeConsult?.status != 'open')
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: PortalColors.slate100,
            child: const Text(
              'This consultation is closed.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: PortalColors.slate600,
              ),
            ),
          )
        else
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_pendingAttachmentUrl != null)
                Container(
                  color: PortalColors.slate100,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      Icon(
                        _pendingAttachmentType == 'image' ? Icons.image_outlined : Icons.attach_file,
                        color: PortalColors.green,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_pendingAttachmentName ?? 'Attachment', maxLines: 1, overflow: TextOverflow.ellipsis)),
                      IconButton(
                        onPressed: () => setState(() {
                          _pendingAttachmentUrl = null;
                          _pendingAttachmentName = null;
                          _pendingAttachmentType = null;
                        }),
                        icon: const Icon(Icons.close, size: 18),
                      ),
                    ],
                  ),
                ),
              if (_attachMenuOpen)
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: Row(
                    children: [
                      TextButton.icon(onPressed: _pickImage, icon: const Icon(Icons.photo, size: 18), label: const Text('Photo')),
                      TextButton.icon(onPressed: _pickDocument, icon: const Icon(Icons.description_outlined, size: 18), label: const Text('Document')),
                      TextButton.icon(onPressed: _pickProduct, icon: const Icon(Icons.medication_outlined, size: 18), label: const Text('Product')),
                    ],
                  ),
                ),
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => setState(() => _attachMenuOpen = !_attachMenuOpen),
                      icon: const Icon(Icons.add_circle_outline, color: PortalColors.slate400),
                    ),
                    Expanded(
                      child: TextField(
                        controller: _input,
                        decoration: InputDecoration(
                          hintText: 'Type a message…',
                          filled: true,
                          fillColor: PortalColors.slate100,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(24),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Material(
                      color: PortalColors.green,
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: _sending ? null : _sendMessage,
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: _sending
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.send, color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _messageBubble(PatientConsultMessage msg) {
    final isMe = msg.isFromPatient;
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFD9FDD3) : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(12),
            topRight: const Radius.circular(12),
            bottomLeft: Radius.circular(isMe ? 12 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 12),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (msg.attachmentType == 'image' && msg.attachmentUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  PatientRepository.resolveMediaUrl(msg.attachmentUrl),
                  height: 120,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.broken_image),
                ),
              ),
            if (msg.attachmentType == 'file')
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.attach_file, size: 16),
                  const SizedBox(width: 4),
                  Flexible(child: Text(msg.attachmentName ?? 'Attachment', style: const TextStyle(fontSize: 13))),
                ],
              ),
            if (msg.attachmentType == 'product')
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (msg.attachmentUrl != null && msg.attachmentUrl!.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(
                        PatientRepository.resolveMediaUrl(msg.attachmentUrl),
                        width: 40,
                        height: 40,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.medication_outlined, size: 20),
                      ),
                    )
                  else
                    const Icon(Icons.medication_outlined, size: 20, color: PortalColors.green),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      msg.attachmentName ?? 'Product',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            if (msg.content.isNotEmpty)
              Text(msg.content, style: const TextStyle(fontSize: 14, color: PortalColors.slate900)),
            const SizedBox(height: 4),
            Text(
              _formatTime(msg.createdAt),
              style: const TextStyle(fontSize: 10, color: PortalColors.slate400),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime d) {
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _ConsultRailEntry {
  const _ConsultRailEntry({
    required this.pharmacist,
    required this.isAnonymous,
    this.consultation,
  });

  final PatientPharmacist pharmacist;
  final bool isAnonymous;
  final PatientConsultation? consultation;
}

class _ConsultProductPicker extends StatefulWidget {
  const _ConsultProductPicker({required this.onPick});

  final ValueChanged<Medicine> onPick;

  @override
  State<_ConsultProductPicker> createState() => _ConsultProductPickerState();
}

class _ConsultProductPickerState extends State<_ConsultProductPicker> {
  final _search = TextEditingController();
  List<Medicine> _results = [];
  bool _loading = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _runSearch('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _runSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      setState(() => _loading = true);
      try {
        final items = await PatientRepository.instance.fetchProducts(search: q, limit: 30);
        if (!mounted) return;
        setState(() {
          _results = items;
          _loading = false;
        });
      } catch (_) {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.72;
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.medication_outlined, color: PortalColors.green),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('Attach a product', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Search products…',
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: PortalColors.slate100,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              onChanged: _runSearch,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: PortalColors.green))
                : _results.isEmpty
                    ? const Center(child: Text('No products found'))
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, i) {
                          final p = _results[i];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: PortalColors.greenLight,
                              child: const Icon(Icons.medication, color: PortalColors.green, size: 18),
                            ),
                            title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(p.category, maxLines: 1, overflow: TextOverflow.ellipsis),
                            onTap: () => widget.onPick(p),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

extension on List<PatientConsultMessage> {
  PatientConsultMessage? get lastOrNull => isEmpty ? null : last;
}
