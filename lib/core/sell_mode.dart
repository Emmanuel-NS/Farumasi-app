/// Matches `farumasi_patient_portal/src/lib/packaging-classes.ts`
enum SellMode { pack, partial }

String cartLineKey(String productId, SellMode mode) {
  return '${productId}:${mode.name}';
}

SellMode? parseSellModeFromKey(String key) {
  if (key.endsWith(':partial')) return SellMode.partial;
  if (key.endsWith(':pack')) return SellMode.pack;
  return null;
}

String lineUnitLabel(
  SellMode mode, {
  String? partialUnitName,
  int? unitsPerPack,
}) {
  if (mode == SellMode.partial) return partialUnitName ?? 'unit';
  if (unitsPerPack != null && unitsPerPack > 1) {
    return 'pack ($unitsPerPack units)';
  }
  return 'pack';
}

int minQuantityForLine(
  SellMode mode, {
  int? minPartialQuantity,
}) {
  if (mode == SellMode.partial) {
    return (minPartialQuantity ?? 1).clamp(1, 9999);
  }
  return 1;
}

String formatRwf(num amount) {
  if (amount == amount.roundToDouble()) {
    return '${amount.round()} RWF';
  }
  return '${amount.toStringAsFixed(0)} RWF';
}
