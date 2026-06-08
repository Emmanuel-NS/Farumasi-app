import 'package:flutter/material.dart';

import '../core/cart_pricing.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';

class SellModePickerResult {
  final SellMode mode;
  final int quantity;

  const SellModePickerResult({required this.mode, required this.quantity});
}

Future<SellModePickerResult?> showSellModePickerSheet(
  BuildContext context,
  Medicine medicine,
) {
  return showModalBottomSheet<SellModePickerResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _SellModePickerSheet(medicine: medicine),
  );
}

class _SellModePickerSheet extends StatefulWidget {
  const _SellModePickerSheet({required this.medicine});

  final Medicine medicine;

  @override
  State<_SellModePickerSheet> createState() => _SellModePickerSheetState();
}

class _SellModePickerSheetState extends State<_SellModePickerSheet> {
  late SellMode _mode;
  late int _qty;

  Medicine get med => widget.medicine;

  @override
  void initState() {
    super.initState();
    _mode = SellMode.pack;
    _qty = minQuantityForLine(_mode, minPartialQuantity: med.minPartialQuantity);
  }

  void _setMode(SellMode mode) {
    setState(() {
      _mode = mode;
      _qty = minQuantityForLine(mode, minPartialQuantity: med.minPartialQuantity);
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      margin: const EdgeInsets.all(12),
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  med.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'How would you like to order?',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ModeChip(
                  label: 'Full pack',
                  subtitle: formatRwf(cartLineUnitPrice(med, SellMode.pack)),
                  selected: _mode == SellMode.pack,
                  onTap: () => _setMode(SellMode.pack),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ModeChip(
                  label: 'By ${med.partialUnitName ?? 'unit'}',
                  subtitle: med.unitPriceFrom != null
                      ? '${formatRwf(med.unitPriceFrom!)} / ${med.partialUnitName ?? 'unit'}'
                      : 'Price varies',
                  selected: _mode == SellMode.partial,
                  onTap: () => _setMode(SellMode.partial),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            _mode == SellMode.partial
                ? 'How many ${med.partialUnitName ?? 'units'}?'
                : 'How many packs?',
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          if (_mode == SellMode.partial &&
              (med.minPartialQuantity ?? 1) > 1) ...[
            const SizedBox(height: 4),
            Text(
              'Minimum ${med.minPartialQuantity} ${med.partialUnitName ?? 'units'}',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton.filled(
                onPressed: () {
                  final min = minQuantityForLine(
                    _mode,
                    minPartialQuantity: med.minPartialQuantity,
                  );
                  if (_qty > min) setState(() => _qty--);
                },
                icon: const Icon(Icons.remove),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5F9),
                  foregroundColor: const Color(0xFF0F172A),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  '$_qty',
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton.filled(
                onPressed: () => setState(() => _qty++),
                icon: const Icon(Icons.add),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF1E9E68),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            lineUnitLabel(
              _mode,
              partialUnitName: med.partialUnitName,
              unitsPerPack: med.unitsPerPack,
            ),
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () => Navigator.pop(
              context,
              SellModePickerResult(mode: _mode, quantity: _qty),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E9E68),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(
              'Add $_qty ${lineUnitLabel(_mode, partialUnitName: med.partialUnitName, unitsPerPack: med.unitsPerPack)} to Cart',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? const Color(0xFF1E9E68) : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
          color: selected ? const Color(0xFFEDFDF6) : Colors.white,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: selected
                    ? const Color(0xFF1E9E68)
                    : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
