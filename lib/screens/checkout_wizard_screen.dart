import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/repositories/patient_repository.dart';
import '../core/cart_pharmacy_scoring.dart';
import '../core/cart_pricing.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/state_service.dart';
import 'auth_screen.dart';

enum CheckoutStep { cart, pharmacy, details, payment, confirmed }

/// Portal-style 5-step checkout wizard (frontend parity; API wiring later).
class CheckoutWizardScreen extends ConsumerStatefulWidget {
  const CheckoutWizardScreen({super.key});

  @override
  ConsumerState<CheckoutWizardScreen> createState() =>
      _CheckoutWizardScreenState();
}

class _CheckoutWizardScreenState extends ConsumerState<CheckoutWizardScreen> {
  CheckoutStep _step = CheckoutStep.cart;
  ScoredPharmacyOption? _selectedPharmacy;
  List<ScoredPharmacyOption> _pharmacyOptions = [];
  bool _listingsLoading = false;
  int _aiPhase = 0;
  bool _aiAnimationDone = false;
  bool _pharmaReady = false;
  Timer? _aiTimer;

  String _selectedCity = 'Kigali';
  final _neighborhoodController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _accessCodeController = TextEditingController();
  String _momoPhone = '';
  bool _isSubmitting = false;
  String? _confirmedOrderCode;

  @override
  void initState() {
    super.initState();
    _phoneController.text = '0780000000';
    _momoPhone = '0780000000';
  }

  @override
  void dispose() {
    _aiTimer?.cancel();
    _neighborhoodController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _accessCodeController.dispose();
    super.dispose();
  }

  void _startAiAnimation() {
    _aiTimer?.cancel();
    setState(() {
      _aiPhase = 0;
      _aiAnimationDone = false;
      _pharmaReady = false;
      _selectedPharmacy = null;
      _pharmacyOptions = [];
    });
    _loadPharmacyRecommendations();
    var tick = 0;
    _aiTimer = Timer.periodic(const Duration(milliseconds: 650), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      tick++;
      setState(() => _aiPhase = (tick % 4).clamp(0, 3));
      if (tick >= 4) {
        t.cancel();
        setState(() => _aiAnimationDone = true);
        _maybeRevealPharmacies();
      }
    });
  }

  void _maybeRevealPharmacies() {
    if (_aiAnimationDone && !_listingsLoading) {
      setState(() => _pharmaReady = true);
    }
  }

  Future<void> _loadPharmacyRecommendations() async {
    setState(() => _listingsLoading = true);
    try {
      final items = List<CartItem>.from(StateService().cartItems);
      final pharmacies = await PatientRepository.instance.fetchPharmacies(limit: 100);
      final map = <String, Map<String, BackendListing>>{};
      for (final item in items) {
        final listings = await PatientRepository.instance.fetchListings(
          productId: item.medicine.id,
          limit: 100,
        );
        for (final listing in listings) {
          final sellerId = listing.pharmacyId ?? listing.partnerCompanyId;
          if (sellerId == null || listing.productId == null) continue;
          map.putIfAbsent(sellerId, () => {})[listing.productId!] = listing;
        }
      }

      List<double>? patientLocation;
      final coords = StateService().userCoordinates;
      if (coords != null) {
        final parts = coords.split(',');
        if (parts.length == 2) {
          final lat = double.tryParse(parts[0].trim());
          final lon = double.tryParse(parts[1].trim());
          if (lat != null && lon != null) patientLocation = [lat, lon];
        }
      }

      final options = scorePharmacies(
        cartLines: items,
        pharmacies: pharmacies,
        listingsMap: map,
        patientDistrict: _selectedCity,
        patientLocation: patientLocation,
      );

      if (!mounted) return;
      setState(() {
        _pharmacyOptions = options;
        _listingsLoading = false;
      });
      _maybeRevealPharmacies();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _listingsLoading = false;
        _pharmacyOptions = [];
      });
      _maybeRevealPharmacies();
    }
  }

  double _catalogueSubtotalMin(List<CartItem> items) => _cartSubtotalRange(items).min;

  double _medicinesTotal(List<CartItem> items) {
    if (_selectedPharmacy != null) {
      return _selectedPharmacy!.priceEstimate - _selectedPharmacy!.insuranceSaving;
    }
    return _catalogueSubtotalMin(items);
  }

  double _deliveryFeeFor(List<CartItem> items) =>
      deliveryFeeForMedicinesSubtotal(_medicinesTotal(items));

  int get _stepIndex {
    switch (_step) {
      case CheckoutStep.cart:
        return 0;
      case CheckoutStep.pharmacy:
        return 1;
      case CheckoutStep.details:
        return 2;
      case CheckoutStep.payment:
        return 3;
      case CheckoutStep.confirmed:
        return 4;
    }
  }

  List<_WizardStep> get _steps => const [
        _WizardStep('Cart', Icons.shopping_cart_outlined),
        _WizardStep('Pharmacy', Icons.store_outlined),
        _WizardStep('Details', Icons.location_on_outlined),
        _WizardStep('Payment', Icons.smartphone_outlined),
        _WizardStep('Done', Icons.check_circle_outline),
      ];

  Future<void> _submitPayment(List<CartItem> items) async {
    if (ref.read(authProvider).status != AuthStatus.authenticated) {
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
      return;
    }

    final missing = <String>[];
    if (_neighborhoodController.text.trim().isEmpty) missing.add('Neighborhood');
    if (_descriptionController.text.trim().isEmpty) missing.add('Delivery instructions');
    if (_phoneController.text.trim().isEmpty) missing.add('Contact phone');
    if (_accessCodeController.text.trim().length < 4) missing.add('Access code (min 4 characters)');
    if (_momoPhone.trim().length < 9) missing.add('MoMo phone number');

    if (missing.isNotEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please provide: ${missing.join(', ')}')),
      );
      return;
    }

    final fullAddress =
        '$_selectedCity, ${_neighborhoodController.text.trim()}, ${_descriptionController.text.trim()}\nPhone: ${_phoneController.text.trim()}';

    double? lat;
    double? lon;
    final coords = StateService().userCoordinates;
    if (coords != null) {
      final parts = coords.split(',');
      if (parts.length == 2) {
        lat = double.tryParse(parts[0].trim());
        lon = double.tryParse(parts[1].trim());
      }
    }

    setState(() => _isSubmitting = true);
    try {
      final cartItems = List<CartItem>.from(StateService().cartItems);
      if (cartItems.isEmpty) throw Exception('Your cart is empty');

      final build = await PatientRepository.instance.buildOrderPayload(
        cartItems: cartItems,
        deliveryMethod: 'delivery',
        deliveryAddress: fullAddress,
        deliveryLatitude: lat,
        deliveryLongitude: lon,
        patientAccessCode: _accessCodeController.text.trim(),
        pharmacyId: _selectedPharmacy?.pharmacy.sellerKind == 'pharmacy'
            ? _selectedPharmacy!.pharmacy.id
            : null,
        partnerCompanyId: _selectedPharmacy?.pharmacy.sellerKind != 'pharmacy'
            ? _selectedPharmacy?.pharmacy.id
            : null,
      );

      final order = await PatientRepository.instance.createOrder(build.payload);
      await PatientRepository.instance.initiateMomo(order.id, _momoPhone.trim());
      await PatientRepository.instance.waitUntilPaid(order.id);

      if (!mounted) return;
      StateService().clearCart();
      setState(() {
        _confirmedOrderCode = order.orderCode ?? order.id;
        _isSubmitting = false;
        _step = CheckoutStep.confirmed;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: StateService(),
      builder: (context, _) {
        final items = StateService().cartItems;
        if (items.isEmpty && _step == CheckoutStep.cart) {
          return _emptyCart(context);
        }

        return Scaffold(
          backgroundColor: Colors.grey.shade50,
          appBar: AppBar(
            elevation: 0,
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            title: const Text(
              'Checkout',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            leading: _step == CheckoutStep.confirmed
                ? null
                : IconButton(
                    icon: const Icon(Icons.arrow_back),
                    onPressed: _goBack,
                  ),
          ),
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _StepBar(steps: _steps, activeIndex: _stepIndex),
                    const SizedBox(height: 8),
                    switch (_step) {
                      CheckoutStep.cart => _buildCartStep(items),
                      CheckoutStep.pharmacy => _buildPharmacyStep(items),
                      CheckoutStep.details => _buildDetailsStep(items),
                      CheckoutStep.payment => _buildPaymentStep(items),
                      CheckoutStep.confirmed => _buildConfirmedStep(),
                    },
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _goBack() {
    switch (_step) {
      case CheckoutStep.pharmacy:
        setState(() => _step = CheckoutStep.cart);
      case CheckoutStep.details:
        setState(() => _step = CheckoutStep.pharmacy);
      case CheckoutStep.payment:
        setState(() => _step = CheckoutStep.details);
      case CheckoutStep.cart:
      case CheckoutStep.confirmed:
        Navigator.pop(context);
    }
  }

  Widget _emptyCart(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 72, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Your cart is empty',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.store_outlined),
              label: const Text('Browse Store'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E9E68),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  ({double min, double max}) _cartSubtotalRange(List<CartItem> items) {
    var min = 0.0;
    var max = 0.0;
    for (final item in items) {
      final unit = cartLineUnitPrice(item.medicine, item.sellMode);
      final packMax = item.sellMode == SellMode.pack &&
              item.medicine.maxPrice != null &&
              item.medicine.maxPrice! > item.medicine.price
          ? item.medicine.maxPrice!
          : unit;
      min += unit * item.quantity;
      max += (packMax > unit ? packMax : unit) * item.quantity;
    }
    return (min: min, max: max);
  }

  Widget _buildCartStep(List<CartItem> items) {
    final range = _cartSubtotalRange(items);
    final deliveryFee = deliveryFeeForMedicinesSubtotal(range.min);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '${items.length} item${items.length == 1 ? '' : 's'} in cart',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        ...items.map((item) => _CartLineCard(item: item)),
        const SizedBox(height: 16),
        _SummaryCard(
          subtotalMin: range.min,
          subtotalMax: range.max,
          deliveryFee: deliveryFee,
        ),
        const SizedBox(height: 8),
        const Text(
          'Final prices are confirmed when you choose a pharmacy.',
          style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () {
            setState(() => _step = CheckoutStep.pharmacy);
            _startAiAnimation();
          },
          style: _primaryBtn,
          child: const Text('Find Best Pharmacy'),
        ),
      ],
    );
  }

  Widget _buildPharmacyStep(List<CartItem> items) {
    final options = _pharmacyOptions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!_pharmaReady)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFEDFDF6),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              children: [
                const Icon(Icons.psychology_outlined, color: Color(0xFF1E9E68), size: 36),
                const SizedBox(height: 12),
                Text(
                  [
                    'Analyzing stock availability…',
                    'Checking insurance coverage…',
                    'Calculating delivery times…',
                    'Ranking nearby pharmacies…',
                  ][_aiPhase],
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                const LinearProgressIndicator(color: Color(0xFF1E9E68)),
              ],
            ),
          )
        else if (options.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Icon(Icons.store_outlined, size: 48, color: Colors.grey.shade400),
                const SizedBox(height: 12),
                const Text(
                  'No matching pharmacies found',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'None of our partner pharmacies currently have your cart items in stock.',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => setState(() => _step = CheckoutStep.cart),
                  child: const Text('← Edit Cart'),
                ),
              ],
            ),
          )
        else ...[
          const Text(
            'Recommended pharmacies',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Pharmacy names are revealed after payment.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),
          ...options.map((opt) {
            final selected = _selectedPharmacy?.codename == opt.codename;
            final isBest = opt.rank == 1;
            final cardDelivery = deliveryFeeForMedicinesSubtotal(
              opt.priceEstimate - opt.insuranceSaving,
            );
            final cardTotal = opt.priceEstimate - opt.insuranceSaving + cardDelivery;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Material(
                color: selected ? const Color(0xFFEDFDF6) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () => setState(() => _selectedPharmacy = opt),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: selected
                            ? const Color(0xFF1E9E68)
                            : const Color(0xFFE2E8F0),
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: isBest
                                  ? const Color(0xFF1E9E68)
                                  : const Color(0xFFF1F5F9),
                              child: Text(
                                opt.codename,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isBest ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'Pharmacy ${opt.codename}',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      if (isBest) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Color(0xFF1E9E68),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: const Text(
                                            'Best Match',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    '${opt.availableCount}/${opt.totalCount} items'
                                    '${opt.distanceKm > 0 ? ' · ${opt.distanceKm.toStringAsFixed(1)} km' : ''}'
                                    ' · ~${opt.estimatedDeliveryMin} min',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                  ),
                                  if (opt.insuranceMatch)
                                    const Text(
                                      'RSSB accepted',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF1E9E68),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              '${cardTotal.round()} RWF',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E9E68),
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
          }),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: _selectedPharmacy != null
                ? () => setState(() => _step = CheckoutStep.details)
                : null,
            style: _primaryBtn,
            child: Text(
              _selectedPharmacy != null
                  ? 'Continue with Pharmacy ${_selectedPharmacy!.codename}'
                  : 'Continue with Pharmacy …',
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDetailsStep(List<CartItem> items) {
    final medicines = _medicinesTotal(items);
    final deliveryFee = _deliveryFeeFor(items);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: _selectedCity,
          decoration: const InputDecoration(
            labelText: 'City',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.location_city),
          ),
          items: ['Kigali', 'Musanze', 'Rubavu', 'Huye']
              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
              .toList(),
          onChanged: (v) => setState(() => _selectedCity = v ?? 'Kigali'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _neighborhoodController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Neighborhood / Area',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.map_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: 'Delivery instructions',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.notes_outlined),
          ),
          maxLines: 2,
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Contact phone',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.phone_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _accessCodeController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Delivery access code (min 4 characters)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock_outline),
            hintText: 'Code for rider/pharmacy verification',
          ),
        ),
        const SizedBox(height: 16),
        if (_selectedPharmacy != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF1E9E68),
                  child: Text(
                    _selectedPharmacy!.codename,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Pharmacy ${_selectedPharmacy!.codename}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        'Address revealed after payment',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        _SummaryCard(
          subtotalMin: medicines,
          subtotalMax: medicines,
          deliveryFee: deliveryFee,
          subtotalLabel: 'Medicines',
          totalLabel: 'Total (est.)',
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _neighborhoodController.text.trim().isEmpty
              ? null
              : () => setState(() => _step = CheckoutStep.payment),
          style: _primaryBtn,
          child: const Text('Continue to Payment'),
        ),
      ],
    );
  }

  Widget _buildPaymentStep(List<CartItem> items) {
    final medicines = _medicinesTotal(items);
    final deliveryFee = _deliveryFeeFor(items);
    final total = medicines + deliveryFee;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Row(
            children: [
              Image.network(
                'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/MTN_logo.svg/120px-MTN_logo.svg.png',
                width: 40,
                height: 40,
                errorBuilder: (_, __, ___) =>
                    const Icon(Icons.smartphone, color: Color(0xFFFFCC00)),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MTN Mobile Money',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Pay securely with MoMo',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'MoMo phone number',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.phone_android),
            hintText: '078XXXXXXX',
          ),
          onChanged: (v) => setState(() => _momoPhone = v),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _accessCodeController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Delivery access code',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock_outline),
          ),
        ),
        const SizedBox(height: 16),
        if (_selectedPharmacy != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              'Pharmacy ${_selectedPharmacy!.codename} · name revealed after payment',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ),
        Text(
          'Total: ${total.round()} RWF',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _isSubmitting ? null : () => _submitPayment(items),
          style: _primaryBtn,
          child: Text(_isSubmitting ? 'Processing…' : 'Pay with MoMo'),
        ),
      ],
    );
  }

  Widget _buildConfirmedStep() {
    return Column(
      children: [
        const SizedBox(height: 32),
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: Color(0xFFEDFDF6),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_circle, color: Color(0xFF1E9E68), size: 48),
        ),
        const SizedBox(height: 24),
        const Text(
          'Order Confirmed!',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        if (_confirmedOrderCode != null)
          Text(
            'Order ${_confirmedOrderCode!}',
            style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1E9E68)),
          ),
        const SizedBox(height: 8),
        Text(
          _selectedPharmacy != null
              ? 'Payment received. ${ _selectedPharmacy!.pharmacy.name } is preparing your order.'
              : 'Payment received. Your pharmacy is preparing your order.',
          style: TextStyle(color: Colors.grey.shade600),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        OutlinedButton(
          onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
          child: const Text('Back to Store'),
        ),
      ],
    );
  }

  ButtonStyle get _primaryBtn => ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF1E9E68),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      );
}

class _StepBar extends StatelessWidget {
  const _StepBar({required this.steps, required this.activeIndex});

  final List<_WizardStep> steps;
  final int activeIndex;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          Expanded(
            flex: i == steps.length - 1 ? 0 : 1,
            child: Row(
              children: [
                _StepDot(
                  icon: steps[i].icon,
                  label: steps[i].label,
                  done: i < activeIndex,
                  active: i == activeIndex,
                ),
                if (i < steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      color: i < activeIndex
                          ? const Color(0xFF1E9E68)
                          : const Color(0xFFE2E8F0),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({
    required this.icon,
    required this.label,
    required this.done,
    required this.active,
  });

  final IconData icon;
  final String label;
  final bool done;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = done || active ? const Color(0xFF1E9E68) : const Color(0xFFE2E8F0);
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: done || active ? const Color(0xFF1E9E68) : color,
            shape: BoxShape.circle,
            boxShadow: active
                ? [
                    BoxShadow(
                      color: const Color(0xFF1E9E68).withValues(alpha: 0.25),
                      blurRadius: 0,
                      spreadRadius: 4,
                    ),
                  ]
                : null,
          ),
          child: Icon(
            done ? Icons.check : icon,
            size: 16,
            color: done || active ? Colors.white : const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: active ? const Color(0xFF1E9E68) : const Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }
}

class _CartLineCard extends StatelessWidget {
  const _CartLineCard({required this.item});

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.network(
              item.medicine.imageUrl,
              width: 56,
              height: 56,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 56,
                height: 56,
                color: const Color(0xFFEDFDF6),
                child: const Icon(Icons.medication, color: Color(0xFF1E9E68)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.medicine.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                if (item.sellMode == SellMode.partial)
                  Text(
                    'Partial · ${item.medicine.partialUnitName ?? 'unit'} × ${item.quantity}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6D28D9)),
                  )
                else
                  Text('Qty: ${item.quantity}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 4),
                Builder(builder: (context) {
                  final unit = cartLineUnitPrice(item.medicine, item.sellMode);
                  final maxUnit = item.sellMode == SellMode.pack &&
                          item.medicine.maxPrice != null &&
                          item.medicine.maxPrice! > item.medicine.price
                      ? item.medicine.maxPrice!
                      : unit;
                  final label = maxUnit > unit + 0.5
                      ? '${unit.round()} – ${maxUnit.round()} RWF'
                      : '${unit.round()} RWF';
                  return Text(
                    label,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E9E68),
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.subtotalMin,
    required this.subtotalMax,
    required this.deliveryFee,
    this.subtotalLabel = 'Subtotal (est.)',
    this.totalLabel = 'Total (est.)',
  });

  final double subtotalMin;
  final double subtotalMax;
  final double deliveryFee;
  final String subtotalLabel;
  final String totalLabel;

  String _range(double min, double max) {
    if (max > min + 0.5) return '${min.round()} – ${max.round()} RWF';
    return '${min.round()} RWF';
  }

  @override
  Widget build(BuildContext context) {
    final totalMin = subtotalMin + deliveryFee;
    final totalMax = subtotalMax + deliveryFee;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          _row(subtotalLabel, _range(subtotalMin, subtotalMax)),
          _row('Delivery', deliveryFee == 0 ? 'Free' : '${deliveryFee.round()} RWF'),
          const Divider(),
          _row(totalLabel, _range(totalMin, totalMax), bold: true),
        ],
      ),
    );
  }

  Widget _row(String label, String amount, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
          Text(
            amount,
            style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w600,
              color: bold ? const Color(0xFF1E9E68) : null,
            ),
          ),
        ],
      ),
    );
  }
}

class _WizardStep {
  const _WizardStep(this.label, this.icon);
  final String label;
  final IconData icon;
}

