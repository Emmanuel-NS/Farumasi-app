import 'package:flutter/material.dart';

import '../api/repositories/patient_repository.dart';
import '../core/cart_pricing.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';
import '../services/state_service.dart';
import '../widgets/portal/portal_ui.dart';

class MedicineDetailScreen extends StatefulWidget {
  const MedicineDetailScreen({super.key, required this.medicine});

  final Medicine medicine;

  @override
  State<MedicineDetailScreen> createState() => _MedicineDetailScreenState();
}

class _MedicineDetailScreenState extends State<MedicineDetailScreen> {
  Medicine? _med;
  bool _loading = true;
  int _quantity = 1;
  SellMode _sellMode = SellMode.pack;
  String _infoTab = 'overview';
  bool _added = false;

  @override
  void initState() {
    super.initState();
    _med = widget.medicine;
    _quantity = minQuantityForLine(_sellMode, minPartialQuantity: widget.medicine.minPartialQuantity);
    _load();
  }

  Future<void> _load() async {
    try {
      final product = await PatientRepository.instance.fetchProductById(widget.medicine.id);
      if (!mounted) return;
      setState(() {
        _med = product;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Medicine get _product => _med ?? widget.medicine;

  void _onSellModeChanged(SellMode mode) {
    setState(() {
      _sellMode = mode;
      final minQ = minQuantityForLine(mode, minPartialQuantity: _product.minPartialQuantity);
      if (_quantity < minQ) _quantity = minQ;
    });
  }

  double get _displayUnitPrice => cartLineUnitPrice(_product, _sellMode);

  double? get _maxUnitPrice {
    if (_sellMode == SellMode.partial) {
      return _product.unitPriceFrom != null && _product.unitPriceFrom! > _displayUnitPrice
          ? _product.unitPriceFrom
          : null;
    }
    if (_product.maxPrice != null && _product.maxPrice! > _product.price) {
      return _product.maxPrice;
    }
    return null;
  }

  int get _cartQty {
    final key = cartLineKey(_product.id, _sellMode);
    for (final item in StateService().cartItems) {
      if (item.lineKey == key) return item.quantity;
    }
    return 0;
  }

  void _addToCart() {
    final med = _product;
    if (med.requiresPrescription) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Prescription required for this item.'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    StateService().addToCart(med, _quantity, sellMode: _sellMode);
    setState(() => _added = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added ${med.name} to cart'),
        backgroundColor: PortalColors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final med = _product;
    final inCart = _cartQty;

    return Scaffold(
      backgroundColor: PortalColors.pageBg,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: PortalColors.green))
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                children: [
                  PortalBackLink(label: 'Back to Store', onTap: () => Navigator.pop(context)),
                  LayoutBuilder(
                    builder: (context, c) {
                      final wide = c.maxWidth >= 900;
                      if (wide) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(width: 320, child: _imageColumn(med)),
                            const SizedBox(width: 24),
                            Expanded(child: _detailsColumn(med, inCart)),
                          ],
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _imageColumn(med),
                          const SizedBox(height: 20),
                          _detailsColumn(med, inCart),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),
                  _infoSections(med),
                ],
              ),
            ),
    );
  }

  Widget _imageColumn(Medicine med) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: AspectRatio(
            aspectRatio: 1,
            child: Hero(
              tag: med.id,
              child: Image.network(
                med.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: PortalColors.slate100,
                  child: const Center(child: Text('💊', style: TextStyle(fontSize: 64))),
                ),
              ),
            ),
          ),
        ),
        if (med.requiresPrescription) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 20),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Prescription Required', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
                      SizedBox(height: 2),
                      Text('A valid prescription is required. Upload yours to order.', style: TextStyle(fontSize: 12, color: Color(0xFFB45309))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _detailsColumn(Medicine med, int inCart) {
    final canAdd = !med.requiresPrescription;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PortalStatusBadge(label: med.category, tone: PortalStatusTone.success),
        const SizedBox(height: 8),
        Text(
          med.name,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: PortalColors.slate900, height: 1.2),
        ),
        if (med.manufacturer.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('By ${med.manufacturer}', style: const TextStyle(fontSize: 14, color: PortalColors.slate500)),
        ],
        if (med.packagingClass != null) ...[
          const SizedBox(height: 8),
          Text('Packaging: ${med.packagingClass}', style: const TextStyle(fontSize: 12, color: PortalColors.slate500)),
        ],
        if (med.allowsPartialSelling) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _sellModeBtn('Whole pack', SellMode.pack)),
              const SizedBox(width: 8),
              Expanded(child: _sellModeBtn('By ${med.partialUnitName ?? 'unit'}', SellMode.partial)),
            ],
          ),
        ],
        const SizedBox(height: 16),
        Text(
          _maxUnitPrice != null && _maxUnitPrice! > _displayUnitPrice
              ? '${_displayUnitPrice.toStringAsFixed(0)} – ${_maxUnitPrice!.toStringAsFixed(0)} RWF'
              : '${_displayUnitPrice.toStringAsFixed(0)} RWF',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: PortalColors.green),
        ),
        Text(
          'per ${lineUnitLabel(_sellMode, partialUnitName: med.partialUnitName, unitsPerPack: med.unitsPerPack)}',
          style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
        ),
        if (med.allowsPartialSelling && med.minPartialQuantity != null) ...[
          const SizedBox(height: 4),
          Text(
            'Minimum ${med.minPartialQuantity} ${med.partialUnitName ?? 'units'}',
            style: const TextStyle(fontSize: 11, color: PortalColors.slate400),
          ),
        ],
        if (canAdd) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              _qtyBtn(Icons.remove, () {
                final minQ = minQuantityForLine(_sellMode, minPartialQuantity: med.minPartialQuantity);
                if (_quantity > minQ) setState(() => _quantity--);
              }),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('$_quantity', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ),
              _qtyBtn(Icons.add, () => setState(() => _quantity++)),
            ],
          ),
        ],
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: canAdd ? _addToCart : null,
            icon: Icon(canAdd
                ? (inCart > 0 || _added ? Icons.check_circle : Icons.shopping_cart_outlined)
                : Icons.description_outlined),
            label: Text(
              med.requiresPrescription
                  ? 'Prescription required to order'
                  : (inCart > 0 || _added
                      ? 'Added to Cart (×${inCart > 0 ? inCart : _quantity} in cart)'
                      : 'Add to Cart'),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: canAdd ? PortalColors.green : PortalColors.slate300,
              foregroundColor: Colors.white,
              disabledBackgroundColor: PortalColors.slate200,
              disabledForegroundColor: PortalColors.slate600,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
        if (med.requiresPrescription) ...[
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Open Prescriptions from the sidebar to upload')),
              );
            },
            icon: const Icon(Icons.upload_file, size: 18),
            label: const Text('Upload Prescription'),
            style: TextButton.styleFrom(foregroundColor: PortalColors.green),
          ),
        ],
      ],
    );
  }

  Widget _sellModeBtn(String label, SellMode mode) {
    final selected = _sellMode == mode;
    return OutlinedButton(
      onPressed: () => _onSellModeChanged(mode),
      style: OutlinedButton.styleFrom(
        backgroundColor: selected ? PortalColors.greenLight : Colors.white,
        foregroundColor: selected ? PortalColors.green : PortalColors.slate600,
        side: BorderSide(color: selected ? PortalColors.green : PortalColors.slate200, width: 2),
        padding: const EdgeInsets.symmetric(vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return Material(
      color: PortalColors.slate100,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(width: 40, height: 40, child: Icon(icon, size: 18)),
      ),
    );
  }

  Widget _infoSections(Medicine med) {
    return LayoutBuilder(
      builder: (context, c) {
        final stacked = c.maxWidth < 700;
        final overview = _overviewCard(med);
        final details = _detailsTable(med);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (stacked) ...[overview, const SizedBox(height: 12), details] else Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [Expanded(child: overview), const SizedBox(width: 12), Expanded(child: details)],
            ),
            const SizedBox(height: 16),
            _richInfoTabs(med),
            if (med.ageDosages.isNotEmpty) ...[
              const SizedBox(height: 16),
              _ageDosages(med),
            ],
          ],
        );
      },
    );
  }

  Widget _overviewCard(Medicine med) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Patient Overview', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900)),
          const SizedBox(height: 8),
          Text(
            med.overviewDescription ?? med.description,
            style: const TextStyle(fontSize: 14, color: PortalColors.slate600, height: 1.5),
          ),
          if (med.dosageSummary != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PortalColors.greenLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Dosage Guide', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: PortalColors.green)),
                  const SizedBox(height: 4),
                  Text(med.dosageSummary!, style: const TextStyle(fontSize: 13, color: PortalColors.slate700, height: 1.4)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _detailsTable(Medicine med) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Product Details', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900)),
          const SizedBox(height: 12),
          _detailRow('Manufacturer', med.manufacturer.isNotEmpty ? med.manufacturer : '—'),
          _detailRow('Category', med.category),
          _detailRow('Type', med.subCategory ?? med.category),
          _detailRow('Prescription', med.requiresPrescription ? 'Required Rx' : 'OTC'),
          if (med.composition != null) _detailRow('Composition', med.composition!),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontSize: 12, color: PortalColors.slate400))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PortalColors.slate800))),
        ],
      ),
    );
  }

  Widget _richInfoTabs(Medicine med) {
    final tabs = <String, String>{
      'overview': med.overviewDescription ?? med.description,
      'dosage': med.dosageDetails ?? med.dosageSummary ?? med.dosage,
      'safety': med.safetyInfo ?? med.sideEffects,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Detailed Information', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: tabs.keys.map((key) {
              final selected = _infoTab == key;
              return GestureDetector(
                onTap: () => setState(() => _infoTab = key),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected ? PortalColors.green : PortalColors.slate100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    key[0].toUpperCase() + key.substring(1),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : PortalColors.slate600,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Text(
            tabs[_infoTab] ?? '',
            style: const TextStyle(fontSize: 14, color: PortalColors.slate600, height: 1.6),
          ),
        ],
      ),
    );
  }

  Widget _ageDosages(Medicine med) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Dosage by Age', style: TextStyle(fontWeight: FontWeight.w700, color: PortalColors.slate900)),
          const SizedBox(height: 12),
          ...med.ageDosages.map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 80,
                      child: Text(a.ageRange.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                    Expanded(child: Text(a.dosageInstructions, style: const TextStyle(fontSize: 13, color: PortalColors.slate600))),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}
