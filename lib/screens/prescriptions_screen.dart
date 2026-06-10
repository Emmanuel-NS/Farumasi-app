import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/repositories/patient_repository.dart';
import '../services/state_service.dart';
import '../utils/media_pick_helper.dart';
import 'order_detail_screen.dart';

enum _RxTab { active, cancelled, upload }

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key, this.openUploadTab = false});

  final bool openUploadTab;

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  late _RxTab _tab;
  List<PatientPrescription> _all = [];
  bool _loading = true;
  bool _refreshing = false;
  String? _cancelTargetId;
  bool _cancelling = false;

  String? _pickedPath;
  List<int>? _pickedBytes;
  String? _pickedName;
  bool _isPdf = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _tab = widget.openUploadTab ? _RxTab.upload : _RxTab.active;
    _load();
  }

  Future<void> _load({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _loading = true;
      });
    } else {
      setState(() => _refreshing = true);
    }
    try {
      final items = await PatientRepository.instance.fetchMyPrescriptions();
      if (mounted) {
        setState(() {
          _all = items;
          _loading = false;
          _refreshing = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _refreshing = false;
        });
      }
    }
  }

  Future<void> _confirmRxOrder(PatientPrescription rx) async {
    final recs = await PatientRepository.instance.fetchPrescriptionRecommendations(rx.id);
    if (!mounted) return;
    if (recs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No pharmacy recommendations available yet.')),
      );
      return;
    }

    final top = recs.first;
    final options = await showDialog<_RxOrderOptions>(
      context: context,
      builder: (ctx) => _RxOrderConfirmDialog(
        sellerName: top.sellerName,
        estimatedTotal: top.estimatedTotalPrice,
        defaultAddress: StateService().userAddress,
      ),
    );
    if (options == null || !mounted) return;

    try {
      final orderId = await PatientRepository.instance.confirmOrderViaRecommendation(
        prescriptionId: rx.id,
        recommendationId: top.id,
        deliveryMethod: options.deliveryMethod,
        deliveryAddress: options.deliveryAddress,
        patientAccessCode: options.accessCode,
        deferDeliveryFee: options.deferDeliveryFee,
      );
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not place order: $e')),
      );
    }
  }

  List<PatientPrescription> get _active => _all
      .where((rx) =>
          rx.status.toLowerCase() != 'cancelled' &&
          rx.status.toLowerCase() != 'expired')
      .toList();

  List<PatientPrescription> get _cancelled => _all
      .where((rx) =>
          rx.status.toLowerCase() == 'cancelled' ||
          rx.status.toLowerCase() == 'expired')
      .toList();

  Future<void> _pickImage(ImageSource source) async {
    if (source == ImageSource.gallery) {
      final picked = await pickImageBytes();
      if (picked == null || !mounted) return;
      setState(() {
        _pickedBytes = picked.bytes;
        _pickedPath = null;
        _pickedName = picked.name;
        _isPdf = false;
      });
      return;
    }
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 85);
    if (file == null || !mounted) return;
    final bytes = await file.readAsBytes();
    setState(() {
      _pickedBytes = bytes;
      _pickedPath = file.path;
      _pickedName = file.name;
      _isPdf = false;
    });
  }

  Future<void> _pickDocument() async {
    final picked = await pickDocumentBytes();
    if (picked == null || !mounted) return;
    setState(() {
      _pickedBytes = picked.bytes;
      _pickedPath = null;
      _pickedName = picked.name;
      _isPdf = picked.isPdf;
    });
  }

  Future<void> _submitUpload() async {
    if ((_pickedBytes == null && _pickedPath == null) || _uploading) return;
    setState(() => _uploading = true);
    try {
      if (_pickedBytes != null && _pickedName != null) {
        await PatientRepository.instance.uploadPrescriptionBytes(
          _pickedBytes!,
          _pickedName!,
        );
      } else if (_pickedPath != null) {
        await PatientRepository.instance.uploadPrescriptionFile(_pickedPath!);
      }
      if (!mounted) return;
      setState(() {
        _pickedPath = null;
        _pickedBytes = null;
        _pickedName = null;
        _tab = _RxTab.active;
      });
      await _load(quiet: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prescription uploaded successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _confirmCancel() async {
    final id = _cancelTargetId;
    if (id == null) return;
    setState(() => _cancelling = true);
    try {
      await PatientRepository.instance.cancelPrescription(id);
      await _load(quiet: true);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not cancel this prescription.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _cancelling = false;
          _cancelTargetId = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          backgroundColor: const Color(0xFFF6F8FB),
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Prescriptions',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            Text(
                              'Upload and manage your prescriptions',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _refreshing ? null : () => _load(quiet: true),
                        icon: _refreshing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh),
                        color: const Color(0xFF1E9E68),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTabs(),
                  const SizedBox(height: 20),
                  if (_loading)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(48),
                        child: CircularProgressIndicator(
                          color: Color(0xFF1E9E68),
                        ),
                      ),
                    )
                  else if (_tab == _RxTab.upload)
                    _buildUploadPanel()
                  else if (_tab == _RxTab.cancelled)
                    _buildList(_cancelled, emptyTitle: 'No cancelled prescriptions')
                  else
                    _buildList(_active, emptyTitle: 'No prescriptions yet'),
                ],
              ),
            ),
          ),
        ),
        if (_cancelTargetId != null) _buildCancelDialog(),
      ],
    );
  }

  Widget _buildTabs() {
    Widget tab(_RxTab key, String label, int count, IconData icon) {
      final selected = _tab == key;
      return Expanded(
        child: InkWell(
          onTap: () => setState(() => _tab = key),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected
                      ? const Color(0xFF1E9E68)
                      : Colors.grey.shade500,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: selected
                          ? const Color(0xFF1E9E68)
                          : Colors.grey.shade600,
                    ),
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? const Color(0xFF1E9E68)
                          : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: selected ? Colors.white : Colors.grey.shade700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          tab(_RxTab.active, 'My Rx', _active.length, Icons.description_outlined),
          tab(_RxTab.cancelled, 'Cancelled', _cancelled.length, Icons.cancel_outlined),
          tab(_RxTab.upload, 'Upload', 0, Icons.upload_outlined),
        ],
      ),
    );
  }

  Widget _buildList(List<PatientPrescription> items, {required String emptyTitle}) {
    if (items.isEmpty) {
      return Column(
        children: [
          const SizedBox(height: 32),
          Icon(Icons.description_outlined, size: 56, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text(
            emptyTitle,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Upload a prescription and our pharmacist will prepare your medicines.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => setState(() => _tab = _RxTab.upload),
            icon: const Icon(Icons.add),
            label: const Text('Upload a Prescription'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF1E9E68),
              side: const BorderSide(color: Color(0xFFACEfd4)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      children: items.map(_buildRxCard).toList(),
    );
  }

  Widget _buildRxCard(PatientPrescription rx) {
    final isCartReady = rx.status == 'sent_to_patient' ||
        rx.status == 'patient_viewing';
    final canCancel = rx.status == 'active' || rx.status == 'draft';
    final fileUrl = rx.uploadedFileUrl != null
        ? PatientRepository.resolveMediaUrl(rx.uploadedFileUrl)
        : null;
    final isPdf = fileUrl?.toLowerCase().contains('.pdf') ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCartReady
              ? const Color(0xFFACEfd4)
              : Colors.grey.shade100,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (isCartReady)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: const BoxDecoration(
                color: Color(0xFF1E9E68),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your cart is ready — confirm to place order',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: fileUrl != null && !isPdf
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: Image.network(
                                fileUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.description_outlined,
                                  color: Color(0xFF1E9E68),
                                ),
                              ),
                            )
                          : Icon(
                              isPdf ? Icons.picture_as_pdf : Icons.medication,
                              color: const Color(0xFF1E9E68),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Uploaded Prescription',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            _relativeDate(rx.createdAt),
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDFDF6),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: const Color(0xFFACEfd4)),
                      ),
                      child: Text(
                        rx.displayStatus,
                        style: const TextStyle(
                          color: Color(0xFF1E9E68),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (fileUrl != null) ...[
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () => launchUrl(Uri.parse(fileUrl)),
                    child: Text(
                      'View uploaded file',
                      style: TextStyle(
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
                if (rx.itemNames.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    rx.itemNames.join(' · '),
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (canCancel)
                      TextButton(
                        onPressed: () =>
                            setState(() => _cancelTargetId = rx.id),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(color: Colors.red),
                        ),
                      ),
                    const Spacer(),
                    if (isCartReady)
                      ElevatedButton(
                        onPressed: () => _confirmRxOrder(rx),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E9E68),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Confirm Order'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadPanel() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Upload New Prescription',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Take a clear photo or upload a PDF of your prescription.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 20),
          if (_pickedBytes != null && !_isPdf)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.memory(
                Uint8List.fromList(_pickedBytes!),
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            )
          else if (_pickedPath != null && !_isPdf && !kIsWeb)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.file(
                File(_pickedPath!),
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            )
          else if (_pickedName != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Icon(
                    _isPdf ? Icons.picture_as_pdf : Icons.image,
                    color: const Color(0xFF1E9E68),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(_pickedName!)),
                ],
              ),
            )
          else
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: const Color(0xFFEDFDF6),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFACEfd4), width: 2),
              ),
              child: const Center(
                child: Icon(
                  Icons.document_scanner_outlined,
                  size: 48,
                  color: Color(0xFF1E9E68),
                ),
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _uploading ? null : () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Camera'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _uploading ? null : () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Gallery'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _uploading ? null : _pickDocument,
            icon: const Icon(Icons.upload_file),
            label: const Text('Choose PDF or image file'),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: (_pickedBytes == null && _pickedPath == null) || _uploading
                ? null
                : _submitUpload,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E9E68),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: _uploading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text(
                    'Submit Prescription',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCancelDialog() {
    return Positioned.fill(
      child: Material(
        color: Colors.black45,
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Cancel this prescription?',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                Text(
                  'This cannot be undone.',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _cancelling
                            ? null
                            : () => setState(() => _cancelTargetId = null),
                        child: const Text('Keep'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _cancelling ? null : _confirmCancel,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          foregroundColor: Colors.white,
                        ),
                        child: Text(_cancelling ? 'Cancelling…' : 'Yes, Cancel'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _relativeDate(DateTime date) {
    final diff = DateTime.now().difference(date).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    if (diff < 7) return '$diff days ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _RxOrderOptions {
  final String deliveryMethod;
  final String? deliveryAddress;
  final String? accessCode;
  final bool deferDeliveryFee;

  const _RxOrderOptions({
    required this.deliveryMethod,
    this.deliveryAddress,
    this.accessCode,
    this.deferDeliveryFee = false,
  });
}

class _RxOrderConfirmDialog extends StatefulWidget {
  const _RxOrderConfirmDialog({
    required this.sellerName,
    this.estimatedTotal,
    this.defaultAddress,
  });

  final String sellerName;
  final double? estimatedTotal;
  final String? defaultAddress;

  @override
  State<_RxOrderConfirmDialog> createState() => _RxOrderConfirmDialogState();
}

class _RxOrderConfirmDialogState extends State<_RxOrderConfirmDialog> {
  String _method = 'delivery';
  bool _deferFee = false;
  late final TextEditingController _addressController;
  late final TextEditingController _accessCodeController;

  @override
  void initState() {
    super.initState();
    _addressController = TextEditingController(text: widget.defaultAddress ?? '');
    _accessCodeController = TextEditingController();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _accessCodeController.dispose();
    super.dispose();
  }

  void _submit() {
    final access = _accessCodeController.text.trim();
    if (access.isNotEmpty && access.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Access code must be at least 4 characters.')),
      );
      return;
    }
    if (_method == 'delivery' && _addressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a delivery address.')),
      );
      return;
    }
    Navigator.pop(
      context,
      _RxOrderOptions(
        deliveryMethod: _method,
        deliveryAddress: _method == 'delivery' ? _addressController.text.trim() : null,
        accessCode: access.isEmpty ? null : access,
        deferDeliveryFee: _deferFee && _method == 'delivery',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final est = widget.estimatedTotal;
    return AlertDialog(
      title: const Text('Confirm order'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Place order via ${widget.sellerName}?'),
            if (est != null) ...[
              const SizedBox(height: 4),
              Text('Est. ${est.toStringAsFixed(0)} RWF', style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 16),
            const Text('Fulfillment', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            RadioListTile<String>(
              title: const Text('Delivery'),
              value: 'delivery',
              groupValue: _method,
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _method = v ?? 'delivery'),
            ),
            RadioListTile<String>(
              title: const Text('Pickup at pharmacy'),
              value: 'pickup',
              groupValue: _method,
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _method = v ?? 'pickup'),
            ),
            if (_method == 'delivery') ...[
              const SizedBox(height: 8),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(
                  labelText: 'Delivery address',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Pay delivery fee to rider on arrival'),
                value: _deferFee,
                onChanged: (v) => setState(() => _deferFee = v ?? false),
              ),
            ],
            const SizedBox(height: 8),
            TextField(
              controller: _accessCodeController,
              decoration: const InputDecoration(
                labelText: 'Access code (optional, min 4 chars)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(onPressed: _submit, child: const Text('Confirm')),
      ],
    );
  }
}
