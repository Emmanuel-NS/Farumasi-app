/// Mirrors `farumasi_patient_portal/src/lib/rx-insurance.ts`

String _normInsuranceName(String value) {
  return value.toLowerCase().trim().replaceAll(RegExp(r'\s+'), ' ');
}

bool pharmacyAcceptsRxInsurance(
  List<String> supportedInsurances,
  String? rxProvider,
) {
  if (rxProvider == null || rxProvider.isEmpty || supportedInsurances.isEmpty) {
    return false;
  }
  final rx = _normInsuranceName(rxProvider);
  for (final name in supportedInsurances) {
    final n = _normInsuranceName(name);
    if (n == rx || n.contains(rx) || rx.contains(n)) return true;
  }
  return false;
}

int calcInsuranceSaving(double fullPrice, num discountPct) {
  if (fullPrice <= 0 || discountPct <= 0) return 0;
  return (fullPrice * discountPct / 100).round();
}

double priceAfterInsurance(double fullPrice, num discountPct) {
  return fullPrice - calcInsuranceSaving(fullPrice, discountPct);
}
