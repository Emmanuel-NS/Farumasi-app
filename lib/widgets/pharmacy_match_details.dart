import 'package:flutter/material.dart';

import '../core/cart_pharmacy_scoring.dart';
import '../core/delivery_pricing.dart';
import '../core/sell_mode.dart';

class MatchCriterion {
  const MatchCriterion({
    required this.key,
    required this.label,
    required this.met,
    this.note,
  });

  final String key;
  final String label;
  final bool met;
  final String? note;
}

String _ordinal(int n) {
  if (n % 100 >= 11 && n % 100 <= 13) return '${n}th';
  switch (n % 10) {
    case 1:
      return '${n}st';
    case 2:
      return '${n}nd';
    case 3:
      return '${n}rd';
    default:
      return '${n}th';
  }
}

List<MatchCriterion> buildMatchCriteria(
  ScoredPharmacyOption opt,
  List<ScoredPharmacyOption> allOptions, {
  required String fulfillment,
  List<double>? patientLocation,
  String patientDistrict = '',
  String? rxInsuranceProvider,
  num? rxInsuranceDiscountPct,
  double? deliveryFee,
}) {
  final criteria = <MatchCriterion>[];
  final fullStock = opt.availableCount == opt.totalCount;

  criteria.add(MatchCriterion(
    key: 'rank',
    label: 'Overall match rank',
    met: opt.rank == 1,
    note: opt.rank == 1
        ? 'Top pick of ${allOptions.length} shown'
        : '#${opt.rank} of ${allOptions.length} shown · ${opt.matchPercent}% fit',
  ));

  criteria.add(MatchCriterion(
    key: 'stock',
    label: 'All medicines in stock',
    met: fullStock,
    note: fullStock
        ? '${opt.totalCount}/${opt.totalCount} items'
        : '${opt.availableCount}/${opt.totalCount} available',
  ));

  final fullStockPeers =
      allOptions.where((o) => o.availableCount == o.totalCount).toList();

  if (fullStock) {
    final rankAmongFull =
        opt.fullStockPriceRank > 0 ? opt.fullStockPriceRank : fullStockPeers.length;
    criteria.add(MatchCriterion(
      key: 'price',
      label: 'Medicine subtotal (full-stock pharmacies only)',
      met: rankAmongFull == 1 && fullStockPeers.length > 1,
      note: fullStockPeers.length <= 1
          ? 'Only pharmacy with all ${opt.totalCount} items · ${formatRwf(opt.priceEstimate)}'
          : rankAmongFull == 1
              ? 'Lowest among ${fullStockPeers.length} with full stock · ${formatRwf(opt.priceEstimate)}'
              : '${_ordinal(rankAmongFull)} of ${fullStockPeers.length} full-stock · ${formatRwf(opt.priceEstimate)}',
    ));
  } else {
    criteria.add(const MatchCriterion(
      key: 'price',
      label: 'Medicine subtotal (full-stock pharmacies only)',
      met: false,
      note: 'Partial stock — price not compared to full-stock pharmacies',
    ));
  }

  if (patientLocation != null || patientDistrict.isNotEmpty) {
    final roadKm = opt.roadDistanceKm > 0 ? opt.roadDistanceKm : 0.0;
    final hasDistanceRank = opt.distanceRank > 0 && opt.totalCandidates > 0;
    criteria.add(MatchCriterion(
      key: 'proximity',
      label: 'Distance rank',
      met: hasDistanceRank && opt.distanceRank == 1,
      note: roadKm > 0
          ? hasDistanceRank
              ? '${_ordinal(opt.distanceRank)} nearest of ${opt.totalCandidates} · ~${roadKm.toStringAsFixed(1)} km est. road (GPS)'
              : '~${roadKm.toStringAsFixed(1)} km est. road distance (straight-line × 1.3)'
          : opt.pharmacy.district.isNotEmpty
              ? 'Same district: ${opt.pharmacy.district} (enable GPS for km)'
              : 'Enable location for distance ranking',
    ));
  }

  if (rxInsuranceProvider != null && rxInsuranceDiscountPct != null) {
    criteria.add(MatchCriterion(
      key: 'insurance',
      label: 'Accepts prescription insurance',
      met: opt.insuranceMatch,
      note: opt.insuranceMatch
          ? '$rxInsuranceProvider accepted · $rxInsuranceDiscountPct% off medicines (−${formatRwf(opt.insuranceSaving)})'
          : 'Does not accept $rxInsuranceProvider — full price ${formatRwf(opt.priceEstimate)}',
    ));
  }

  criteria.add(MatchCriterion(
    key: 'open',
    label: 'Open now (high priority)',
    met: opt.pharmacy.isOpen,
    note: opt.pharmacy.isOpen ? 'Ready to fulfill' : 'Currently closed — ranked lower',
  ));

  criteria.add(const MatchCriterion(
    key: 'weights',
    label: 'How match % is calculated',
    met: true,
    note:
        'Priority: stock & open → insurance (Rx only) → distance & full-stock price (equal weight)',
  ));

  if (fulfillment == 'delivery' && deliveryFee != null && deliveryFee > 0) {
    criteria.add(MatchCriterion(
      key: 'delivery_fee',
      label: 'Estimated delivery fee',
      met: true,
      note: '${formatRwf(deliveryFee)} based on road distance to your address',
    ));
  }

  return criteria;
}

Future<void> showPharmacyMatchDetails(
  BuildContext context, {
  required ScoredPharmacyOption option,
  required List<ScoredPharmacyOption> allOptions,
  required String fulfillment,
  List<double>? patientLocation,
  String patientDistrict = '',
  String? rxInsuranceProvider,
  num? rxInsuranceDiscountPct,
}) {
  final roadKm = option.roadDistanceKm;
  final deliveryFee = fulfillment == 'delivery'
      ? (roadKm > 0 ? calcDeliveryFee(roadKm) : 1500.0)
      : 0.0;

  final criteria = buildMatchCriteria(
    option,
    allOptions,
    fulfillment: fulfillment,
    patientLocation: patientLocation,
    patientDistrict: patientDistrict,
    rxInsuranceProvider: rxInsuranceProvider,
    rxInsuranceDiscountPct: rxInsuranceDiscountPct,
    deliveryFee: deliveryFee,
  );

  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: const Color(0xFF1E9E68),
                    backgroundImage: option.pharmacy.imageUrl.isNotEmpty
                        ? NetworkImage(option.pharmacy.imageUrl)
                        : null,
                    child: option.pharmacy.imageUrl.isEmpty
                        ? Text(
                            option.codename,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pharmacy ${option.codename}${option.rank == 1 ? ' · Best Match' : ''}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${option.pharmacy.district}${roadKm > 0 ? ' · ~${roadKm.toStringAsFixed(1)} km est. road' : ''}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDFDF6),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'MATCH SCORE',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF065F46),
                              ),
                            ),
                            Text(
                              '${option.matchPercent}%',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF1E9E68),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: option.matchPercent / 100,
                            minHeight: 6,
                            backgroundColor: Colors.white,
                            color: const Color(0xFF1E9E68),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Products & prices',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  ...option.availability.map(
                    (med) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Icon(
                            med.available ? Icons.check_circle : Icons.cancel,
                            size: 18,
                            color: med.available ? Colors.green : Colors.red,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(med.medicineName, style: const TextStyle(fontSize: 13))),
                          Text(
                            med.available ? formatRwf(med.unitPrice) : 'N/A',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: med.available ? Colors.black : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal'),
                      Text(
                        formatRwf(option.priceEstimate),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF1E9E68),
                        ),
                      ),
                    ],
                  ),
                  if (option.insuranceMatch && option.insuranceSaving > 0) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Insurance${rxInsuranceProvider != null ? ' ($rxInsuranceProvider)' : ''}'),
                        Text(
                          '−${formatRwf(option.insuranceSaving)}',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('You pay (medicines)', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text(
                          formatRwf(option.priceAfterInsurance),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1E9E68),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 20),
                  const Text(
                    'Why recommended',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  ...criteria.map(
                    (c) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: c.met ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: c.met ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            c.met ? Icons.check_circle : Icons.cancel_outlined,
                            size: 18,
                            color: c.met ? Colors.green : Colors.grey,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                if (c.note != null)
                                  Text(c.note!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E9E68),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
