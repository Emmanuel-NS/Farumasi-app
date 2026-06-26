import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/repositories/auth_repository.dart';
import '../api/repositories/patient_repository.dart';
import '../core/cart_pharmacy_scoring.dart';
import '../core/cart_pricing.dart';
import '../core/delivery_pricing.dart';
import '../core/kigali_locations.dart';
import '../core/sell_mode.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/state_service.dart';
import '../widgets/auth_helper.dart';
import '../widgets/pharmacy_match_details.dart';
import '../screens/flutterwave_checkout_screen.dart';
import '../widgets/payment_method_selector.dart';
import '../widgets/searchable_select.dart';
import 'order_detail_screen.dart';

enum CheckoutStep { cart, pharmacy, details, payment, confirmed }

const _rwandaDistricts = [
  'Bugesera', 'Burera', 'Gakenke', 'Gasabo', 'Gatsibo', 'Gicumbi',
  'Gisagara', 'Huye', 'Kamonyi', 'Karongi', 'Kayonza', 'Kicukiro',
  'Kirehe', 'Muhanga', 'Musanze', 'Ngoma', 'Ngororero', 'Nyabihu',
  'Nyagatare', 'Nyamagabe', 'Nyamasheke', 'Nyanza', 'Nyarugenge',
  'Nyaruguru', 'Rubavu', 'Ruhango', 'Rulindo', 'Rusizi', 'Rutsiro',
  'Rwamagana',
];

/// Portal-style 5-step checkout wizard (frontend parity; API wiring later).
class CheckoutWizardScreen extends ConsumerStatefulWidget {
  const CheckoutWizardScreen({super.key, this.isEmbedded = false});

  final bool isEmbedded;

  @override
  ConsumerState<CheckoutWizardScreen> createState() =>
      _CheckoutWizardScreenState();
}

class _CheckoutWizardScreenState extends ConsumerState<CheckoutWizardScreen> {
  CheckoutStep _step = CheckoutStep.cart;
  ScoredPharmacyOption? _selectedPharmacy;
  List<ScoredPharmacyOption> _pharmacyOptions = [];
  List<Pharmacy> _pharmacyList = [];
  CartListingsMap _listingsMap = {};
  final Map<String, Pharmacy> _sellersFromListings = {};
  bool _listingsLoading = false;
  int _aiPhase = 0; // 0=idle, 1-4=animation, 5=done
  bool _aiAnimationDone = false;
  bool _pharmaReady = false;
  Timer? _aiTimer;

  String _fulfillment = 'delivery';
  bool _deferDeliveryFee = false;
  String _patientDistrict = '';
  String _deliveryDistrict = '';
  String _deliveryHood = '';
  final _nameController = TextEditingController();
  final _neighborhoodController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _accessCodeController = TextEditingController();
  bool _isSubmitting = false;
  bool _locationDenied = false;
  bool _locationLoading = false;
  double? _patientLat;
  double? _patientLon;
  String? _confirmedOrderCode;
  String? _confirmedOrderId;
  bool _detailsPrefilled = false;
  PaymentChannel _paymentChannel = PaymentChannel.flutterwave;

  @override
  void initState() {
    super.initState();
    _nameController.text = StateService().userName ?? '';
    final authPhone = ref.read(authProvider).user?.phone;
    _phoneController.text = authPhone?.trim().isNotEmpty == true
        ? authPhone!.trim()
        : '0780000000';
    _hydrateLocationFromState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_step == CheckoutStep.pharmacy ||
          (_fulfillment == 'delivery' &&
              (_step == CheckoutStep.details || _step == CheckoutStep.payment))) {
        _requestPatientLocation();
      }
    });
  }

  void _hydrateLocationFromState() {
    final coords = StateService().userCoordinates;
    if (coords == null) return;
    final parts = coords.split(',');
    if (parts.length != 2) return;
    final lat = double.tryParse(parts[0].trim());
    final lon = double.tryParse(parts[1].trim());
    if (lat != null && lon != null) {
      _patientLat = lat;
      _patientLon = lon;
    }
  }

  Future<void> _requestPatientLocation() async {
    setState(() {
      _locationLoading = true;
      _locationDenied = false;
    });
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        setState(() {
          _locationDenied = true;
          _locationLoading = false;
        });
        return;
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        setState(() {
          _locationDenied = true;
          _locationLoading = false;
        });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (!mounted) return;
      setState(() {
        _patientLat = pos.latitude;
        _patientLon = pos.longitude;
        _locationDenied = false;
        _locationLoading = false;
      });
      StateService().setLocation(
        StateService().userAddress ?? 'Current location',
        '${pos.latitude},${pos.longitude}',
      );
      if (_step == CheckoutStep.pharmacy) {
        _recomputePharmacyOptions();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _locationDenied = true;
        _locationLoading = false;
      });
    }
  }

  bool get _deliveryLocationReady =>
      _fulfillment != 'delivery' || (_patientLat != null && _patientLon != null);

  @override
  void dispose() {
    _aiTimer?.cancel();
    _nameController.dispose();
    _neighborhoodController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _accessCodeController.dispose();
    super.dispose();
  }

  Future<void> _goToPharmacyStep() async {
    final signedIn = await promptSignIn(context, ref);
    if (!signedIn || !mounted) return;
    setState(() => _step = CheckoutStep.pharmacy);
    _startAiAnimation();
    if (_patientLat == null) _requestPatientLocation();
  }

  void _startAiAnimation() {
    _aiTimer?.cancel();
    setState(() {
      _aiPhase = 1;
      _aiAnimationDone = false;
      _pharmaReady = false;
      _selectedPharmacy = null;
    });
    _refreshPharmacyData();
    _runAiPhases();
  }

  Future<void> _refreshPharmacyData() async {
    await Future.wait([
      _loadSellerList(),
      _loadListingsForCart(),
    ]);
  }

  Future<void> _runAiPhases() async {
    for (final delay in [750, 750, 650, 500]) {
      await Future<void>.delayed(Duration(milliseconds: delay));
      if (!mounted) return;
      if (_aiPhase < 4) setState(() => _aiPhase++);
    }
    if (!mounted) return;
    setState(() {
      _aiPhase = 5;
      _aiAnimationDone = true;
    });
    _maybeRevealPharmacies();
  }

  void _maybeRevealPharmacies() {
    if (_aiPhase >= 5 && !_listingsLoading) {
      setState(() => _pharmaReady = true);
    }
  }

  Future<void> _loadSellerList() async {
    try {
      final store = await PatientRepository.instance.fetchStoreSellers();
      var sellers = store.sellers;
      if (sellers.isEmpty) {
        final results = await Future.wait([
          PatientRepository.instance.fetchPharmacies(limit: 100, openOnly: true),
          PatientRepository.instance.fetchPublicPartners(limit: 100),
        ]);
        final pharmacies = results[0] as List<Pharmacy>;
        final partners = results[1] as List<StorePartner>;
        final pharmNames = pharmacies.map((p) => p.name.trim().toLowerCase()).toSet();
        final withPartner = partners
            .where((p) => (p.companyType ?? '').toLowerCase() != 'pharmacy')
            .where((p) => !pharmNames.contains(p.name.trim().toLowerCase()))
            .map(
              (p) => Pharmacy(
                id: p.id,
                name: p.name,
                locationName: p.description ?? p.district ?? 'Rwanda',
                coordinates: [p.latitude ?? -1.9441, p.longitude ?? 30.0619],
                supportedInsurances: const [],
                isOpen: p.isOpen,
                imageUrl: p.logoUrl,
                district: p.district ?? 'Rwanda',
                sellerKind: 'partner',
              ),
            )
            .toList();
        sellers = [...pharmacies, ...withPartner];
      }
      if (!mounted) return;
      setState(() => _pharmacyList = sellers);
      _mergeSellersFromListings();
      _recomputePharmacyOptions();
    } catch (_) {
      _mergeSellersFromListings();
      _recomputePharmacyOptions();
    }
  }

  /// Ensures every seller present in listing data exists in [_pharmacyList].
  void _mergeSellersFromListings() {
    if (_listingsMap.isEmpty && _sellersFromListings.isEmpty) return;
    final known = _pharmacyList.map((p) => p.id).toSet();
    final extras = <Pharmacy>[];
    for (final sellerId in _listingsMap.keys) {
      if (known.contains(sellerId)) continue;
      final fromListing = _sellersFromListings[sellerId];
      if (fromListing != null) {
        extras.add(fromListing);
      } else {
        extras.add(Pharmacy(
          id: sellerId,
          name: 'Pharmacy',
          locationName: 'Rwanda',
          coordinates: const [-1.9441, 30.0619],
          supportedInsurances: const [],
          isOpen: true,
          imageUrl: '',
          district: 'Kigali',
          sellerKind: 'pharmacy',
        ));
      }
    }
    if (extras.isEmpty) return;
    _pharmacyList = [..._pharmacyList, ...extras];
  }

  Future<void> _loadListingsForCart() async {
    if (!mounted) return;
    setState(() => _listingsLoading = true);
    try {
      final items = List<CartItem>.from(StateService().cartItems);
      if (items.isEmpty) {
        if (!mounted) return;
        setState(() {
          _listingsMap = {};
          _listingsLoading = false;
        });
        _recomputePharmacyOptions();
        _maybeRevealPharmacies();
        return;
      }
      final map = <String, Map<String, CartListingEntry>>{};
      await Future.wait(
        items.map((item) async {
          try {
            final listings = await PatientRepository.instance.fetchListings(
              productId: item.medicine.id,
              limit: 100,
            );
            for (final listing in listings) {
              final sellerId = listing.pharmacyId ?? listing.partnerCompanyId;
              if (sellerId == null || listing.productId == null) continue;
              map.putIfAbsent(sellerId, () => {})[listing.productId!] =
                  listingToCartEntry(listing);
              final seller = listing.toPharmacySeller();
              if (seller != null) {
                _sellersFromListings[sellerId] = seller;
              }
            }
          } catch (_) {}
        }),
      );
      if (!mounted) return;
      setState(() {
        _listingsMap = map;
        _listingsLoading = false;
      });
      _mergeSellersFromListings();
      _recomputePharmacyOptions();
      _maybeRevealPharmacies();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _listingsLoading = false;
        _listingsMap = {};
      });
      _recomputePharmacyOptions();
      _maybeRevealPharmacies();
    }
  }

  void _recomputePharmacyOptions() {
    final items = List<CartItem>.from(StateService().cartItems);
    if (items.isEmpty || _pharmacyList.isEmpty) {
      setState(() => _pharmacyOptions = []);
      return;
    }
    List<double>? patientLocation;
    if (_patientLat != null && _patientLon != null) {
      patientLocation = [_patientLat!, _patientLon!];
    }
    final options = scorePharmacies(
      cartLines: items,
      pharmacies: _pharmacyList,
      listingsMap: _listingsMap,
      patientDistrict: _patientDistrict,
      patientLocation: patientLocation,
    );
    setState(() => _pharmacyOptions = options);
    if (_selectedPharmacy != null) {
      final match = options.where((o) => o.codename == _selectedPharmacy!.codename);
      if (match.isNotEmpty) _selectedPharmacy = match.first;
    }
  }

  ListingPriceMap get _listingPriceMap {
    final out = <String, Map<String, ({double price, double? unitPrice})>>{};
    for (final sellerEntry in _listingsMap.entries) {
      out[sellerEntry.key] = {};
      for (final productEntry in sellerEntry.value.entries) {
        out[sellerEntry.key]![productEntry.key] = (
          price: productEntry.value.price,
          unitPrice: productEntry.value.unitPrice,
        );
      }
    }
    return out;
  }

  Future<void> _prefillDetailsFromProfile() async {
    if (_detailsPrefilled) return;
    final auth = ref.read(authProvider);
    if (auth.status != AuthStatus.authenticated || auth.user == null) {
      _detailsPrefilled = true;
      return;
    }
    _detailsPrefilled = true;
    final user = auth.user!;
    if (_nameController.text.trim().isEmpty && user.name.isNotEmpty) {
      _nameController.text = user.name;
    }
    if (_phoneController.text == '0780000000' && (user.phone ?? '').isNotEmpty) {
      _phoneController.text = user.phone!;
    }
    try {
      final addresses = await PatientRepository.instance.listAddresses();
      PatientAddress? defaultAddr;
      for (final a in addresses) {
        if (a.isDefault) {
          defaultAddr = a;
          break;
        }
      }
      defaultAddr ??= addresses.isNotEmpty ? addresses.first : null;
      if (defaultAddr != null) {
        if (_deliveryDistrict.isEmpty &&
            (defaultAddr.district ?? '').isNotEmpty) {
          _deliveryDistrict = defaultAddr.district!;
        }
        if (_descriptionController.text.trim().isEmpty &&
            (defaultAddr.line2 ?? '').isNotEmpty) {
          _descriptionController.text = defaultAddr.line2!;
        }
      }
    } catch (_) {}
    if (mounted) setState(() {});
  }

  Future<void> _enterDetailsStep() async {
    setState(() => _step = CheckoutStep.details);
    if (_fulfillment == 'delivery') _requestPatientLocation();
    await _prefillDetailsFromProfile();
  }

  bool get _canContinueDetails {
    if (_nameController.text.trim().isEmpty) return false;
    if (_phoneController.text.trim().isEmpty) return false;
    if (_accessCodeController.text.trim().length < 4) return false;
    if (_fulfillment == 'delivery') {
      if (!_deliveryLocationReady) return false;
      if (!isKigaliDeliveryDistrict(_deliveryDistrict)) return false;
      if (_deliveryHood.trim().isEmpty) return false;
    }
    return true;
  }

  String _deliveryAddressForOrder() {
    if (_fulfillment != 'delivery') return '';
    return [
      _deliveryHood.trim(),
      _deliveryDistrict,
      'Kigali',
    ].where((s) => s.isNotEmpty).join(', ');
  }

  double _catalogueSubtotalMin(List<CartItem> items) {
    final packLines = items.where((e) => e.sellMode != SellMode.partial).toList();
    final partialLines = items.where((e) => e.sellMode == SellMode.partial).toList();
    var subtotal = 0.0;
    for (final e in packLines) {
      subtotal += e.medicine.price * e.quantity;
    }
    for (final e in partialLines) {
      final range = lineUnitPriceRange(e.medicine, e.sellMode, _listingPriceMap);
      subtotal += (range?.min ?? e.medicine.unitPriceFrom ?? 0) * e.quantity;
    }
    return subtotal;
  }

  double _catalogueSubtotalMax(List<CartItem> items) {
    final packLines = items.where((e) => e.sellMode != SellMode.partial).toList();
    final partialLines = items.where((e) => e.sellMode == SellMode.partial).toList();
    var subtotal = 0.0;
    for (final e in packLines) {
      subtotal += (e.medicine.maxPrice ?? e.medicine.price) * e.quantity;
    }
    for (final e in partialLines) {
      final range = lineUnitPriceRange(e.medicine, e.sellMode, _listingPriceMap);
      subtotal += (range?.max ?? e.medicine.unitPriceFrom ?? 0) * e.quantity;
    }
    return subtotal;
  }

  double _medicinesTotal(List<CartItem> items) {
    if (_selectedPharmacy != null) {
      return _selectedPharmacy!.priceAfterInsurance;
    }
    return _catalogueSubtotalMin(items);
  }

  double? _deliveryFeeFor(List<CartItem> items) {
    if (_fulfillment == 'pickup') return 0;
    if (_patientLat == null || _patientLon == null) return null;
    final roadKm = _selectedPharmacy?.roadDistanceKm ?? 0;
    if (roadKm > maxDeliveryKm && _deliveryTooFar) return null;
    if (roadKm > 0) return calcDeliveryFee(roadKm);
    return 1500;
  }

  bool get _deliveryTooFar {
    if (_fulfillment != 'delivery' || _selectedPharmacy == null) return false;
    final roadKm = _selectedPharmacy!.roadDistanceKm;
    if (roadKm <= maxDeliveryKm) return false;
    return !isKigaliDeliveryDistrict(_deliveryDistrict);
  }

  void _enforcePickupIfTooFar() {
    if (_deliveryTooFar && _fulfillment == 'delivery') {
      setState(() => _fulfillment = 'pickup');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Delivery is not available beyond 20 km outside Kigali. Switched to pickup.',
            ),
          ),
        );
      }
    }
  }

  double _amountDueNow(List<CartItem> items) {
    final medicines = _medicinesTotal(items);
    final delivery = _deliveryFeeFor(items) ?? 0;
    final total = medicines + delivery;
    if (_deferDeliveryFee && delivery > 0 && _fulfillment == 'delivery') {
      return total - delivery;
    }
    return total;
  }

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
        _WizardStep('Payment', Icons.credit_card_outlined),
        _WizardStep('Done', Icons.check_circle_outline),
      ];

  Future<void> _submitPayment(List<CartItem> items) async {
    if (ref.read(authProvider).status != AuthStatus.authenticated) {
      if (!mounted) return;
      final signedIn = await promptSignIn(context, ref);
      if (!signedIn || !mounted) return;
    }

    final missing = <String>[];
    if (_nameController.text.trim().isEmpty) missing.add('Full name');
    if (_phoneController.text.trim().isEmpty) missing.add('Contact phone');
    if (_fulfillment == 'delivery') {
      if (!_deliveryLocationReady) {
        missing.add('Location access (enable GPS for delivery fee)');
      }
      if (!isKigaliDeliveryDistrict(_deliveryDistrict)) {
        missing.add('Kigali delivery district');
      }
      if (_deliveryHood.trim().isEmpty) missing.add('Neighbourhood / sector');
    }
    if (_accessCodeController.text.trim().length < 4) {
      missing.add('Access code (min 4 characters)');
    }
    if (_paymentChannel.requiresPhone && _phoneController.text.trim().length < 9) {
      missing.add('Mobile money number');
    }

    if (missing.isNotEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please provide: ${missing.join(', ')}')),
      );
      return;
    }

    final deliveryAddress = _fulfillment == 'delivery'
        ? _deliveryAddressForOrder()
        : null;

    double? lat = _patientLat;
    double? lon = _patientLon;
    if (_fulfillment == 'delivery' && (lat == null || lon == null)) {
      await _requestPatientLocation();
      lat = _patientLat;
      lon = _patientLon;
      if (lat == null || lon == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Enable location access to place a delivery order.'),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => _isSubmitting = false);
        return;
      }
    }

    setState(() => _isSubmitting = true);
    try {
      final cartItems = List<CartItem>.from(StateService().cartItems);
      if (cartItems.isEmpty) throw Exception('Your cart is empty');

      final build = await PatientRepository.instance.buildOrderPayload(
        cartItems: cartItems,
        deliveryMethod: _fulfillment,
        deliveryAddress: deliveryAddress,
        deliveryLatitude: lat,
        deliveryLongitude: lon,
        patientAccessCode: _accessCodeController.text.trim(),
        deferDeliveryFee: _deferDeliveryFee && _fulfillment == 'delivery',
        notes: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        pharmacyId: _selectedPharmacy?.pharmacy.sellerKind == 'pharmacy'
            ? _selectedPharmacy!.pharmacy.id
            : null,
        partnerCompanyId: _selectedPharmacy?.pharmacy.sellerKind != 'pharmacy'
            ? _selectedPharmacy?.pharmacy.id
            : null,
      );

      final order = await PatientRepository.instance.createOrder(build.payload);

      final orderDueRwf = (order.deferDeliveryFee
              ? order.subtotal
              : order.totalAmount)
          .round();
      final processingFee = paymentProcessingFeeRwf(orderDueRwf);
      final chargeTotal = orderDueRwf + processingFee;

      if (!mounted) return;
      final proceed = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Confirm payment amount'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Order ${order.orderCode ?? order.id}'),
              const SizedBox(height: 12),
              _confirmAmountRow('Medicines', '${order.subtotal.round()} RWF'),
              if (order.deliveryFee > 0 && !order.deferDeliveryFee)
                _confirmAmountRow('Delivery', '${order.deliveryFee.round()} RWF'),
              if (order.deferDeliveryFee && order.deliveryFee > 0)
                _confirmAmountRow(
                  'Delivery',
                  '${order.deliveryFee.round()} RWF (pay on delivery)',
                ),
              if (processingFee > 0)
                _confirmAmountRow(
                  'Processing fee ($paymentProcessingFeePercent%)',
                  '$processingFee RWF',
                ),
              const Divider(height: 20),
              _confirmAmountRow('Total to pay now', '$chargeTotal RWF', bold: true),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Pay now'),
            ),
          ],
        ),
      );
      if (proceed != true) {
        try {
          await PatientRepository.instance.cancelOrder(order.id);
        } catch (_) {}
        if (mounted) setState(() => _isSubmitting = false);
        return;
      }

      final init = await PatientRepository.instance.initiateFlutterwave(
        order.id,
        phone: _phoneController.text.trim(),
        name: _nameController.text.trim(),
        email: ref.read(authProvider).user?.email,
        redirectUrl:
            '${PatientRepository.apiOrigin}/payment-return?order_id=${order.id}',
      );

      if (init.checkoutUrl != null && init.checkoutUrl!.isNotEmpty) {
        if (!mounted) return;
        final completed = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => FlutterwaveCheckoutScreen(checkoutUrl: init.checkoutUrl!),
          ),
        );
        if (completed != true && !mounted) return;
      } else if (init.paymentStatus != 'paid') {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              init.message.isNotEmpty
                  ? init.message
                  : 'Approve the payment on your phone, then wait…',
            ),
            duration: const Duration(seconds: 8),
          ),
        );
      }

      if (init.paymentStatus != 'paid') {
        await PatientRepository.instance.waitUntilPaid(order.id);
      }

      if (!mounted) return;
      StateService().clearCart();
      setState(() {
        _confirmedOrderId = order.id;
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
          appBar: widget.isEmbedded
              ? null
              : AppBar(
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

  ({double min, double max}) _cartSubtotalRange(List<CartItem> items) =>
      (min: _catalogueSubtotalMin(items), max: _catalogueSubtotalMax(items));

  Widget _stepHeader(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  Widget _buildCartStep(List<CartItem> items) {
    final listings = _listingPriceMap;
    final packLines = items.where((e) => e.sellMode != SellMode.partial).toList();
    final partialLines = items.where((e) => e.sellMode == SellMode.partial).toList();
    final subtotalMin = _catalogueSubtotalMin(items);
    final subtotalMax = _catalogueSubtotalMax(items);
    final hasCatalogRange = subtotalMax > subtotalMin + 0.5;
    final partialUnpriced = partialLines.isNotEmpty &&
        partialLines.every((e) {
          final r = lineUnitPriceRange(e.medicine, e.sellMode, listings);
          return r == null || r.min <= 0;
        });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _stepHeader(
          'Your Cart',
          '${items.length} product${items.length == 1 ? '' : 's'} in cart',
        ),
        ...items.map((item) {
          final unitLabel = item.sellMode == SellMode.partial
              ? (item.medicine.partialUnitName ?? 'unit')
              : 'pack';
          final unitRange = lineUnitPriceRange(item.medicine, item.sellMode, listings);
          final minQty = minQuantityForLine(
            item.sellMode,
            minPartialQuantity: item.medicine.minPartialQuantity,
          );
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: item.medicine.imageUrl.isNotEmpty
                      ? Image.network(item.medicine.imageUrl, width: 64, height: 64, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _productThumbPlaceholder(64))
                      : _productThumbPlaceholder(64),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.medicine.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text(item.medicine.category,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF1E9E68), fontWeight: FontWeight.w600)),
                      Text(
                        item.sellMode == SellMode.partial ? 'Partial · per $unitLabel' : 'Whole pack',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 6),
                      if (unitRange == null)
                        const Text('Price set at pharmacy',
                            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic))
                      else if (unitRange.min != unitRange.max)
                        Text('${formatRwf(unitRange.min)} – ${formatRwf(unitRange.max)} / $unitLabel',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1E9E68), fontSize: 13))
                      else
                        Text('${formatRwf(unitRange.min)} / $unitLabel',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF1E9E68), fontSize: 13)),
                    ],
                  ),
                ),
                Column(
                  children: [
                    IconButton(
                      onPressed: () {
                        StateService().removeFromCart(item.lineKey);
                        setState(() {});
                        _loadListingsForCart();
                      },
                      icon: Icon(Icons.delete_outline, size: 18, color: Colors.red.shade300),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          InkWell(
                            onTap: item.quantity <= minQty
                                ? null
                                : () {
                                    StateService().decrementQuantity(item.lineKey);
                                    setState(() {});
                                  },
                            child: const Padding(
                              padding: EdgeInsets.all(6),
                              child: Text('−', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Text('${item.quantity}',
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                          InkWell(
                            onTap: () {
                              StateService().incrementQuantity(item.lineKey);
                              setState(() {});
                            },
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E9E68),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text('+',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Order Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 12),
              ...items.map((item) {
                final lineTotal = lineTotalPriceRange(item.medicine, item.sellMode, item.quantity, listings);
                final unitLabel = item.sellMode == SellMode.partial
                    ? (item.medicine.partialUnitName ?? 'unit')
                    : 'pack';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${item.medicine.name} ×${item.quantity} $unitLabel',
                          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        lineTotal == null
                            ? 'At pharmacy'
                            : lineTotal.min != lineTotal.max
                                ? '${formatRwf(lineTotal.min)} – ${formatRwf(lineTotal.max)}'
                                : formatRwf(lineTotal.min),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: lineTotal == null ? const Color(0xFF94A3B8) : const Color(0xFF334155),
                          fontStyle: lineTotal == null ? FontStyle.italic : FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Subtotal', style: TextStyle(color: Color(0xFF475569))),
                  Text(
                    partialUnpriced && packLines.isEmpty
                        ? 'Confirmed at pharmacy'
                        : hasCatalogRange
                            ? '${formatRwf(subtotalMin)} – ${formatRwf(subtotalMax)}'
                            : formatRwf(subtotalMin),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Delivery fee', style: TextStyle(color: Color(0xFF475569))),
                  Text('Confirmed at pharmacy',
                      style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic)),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(
                    partialUnpriced && packLines.isEmpty
                        ? 'See at pharmacy'
                        : hasCatalogRange
                            ? '${formatRwf(subtotalMin)} – ${formatRwf(subtotalMax)}'
                            : formatRwf(subtotalMin),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      color: Color(0xFF1E9E68),
                    ),
                  ),
                ],
              ),
              if (hasCatalogRange)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Final prices are confirmed when you choose a pharmacy.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontStyle: FontStyle.italic),
                    textAlign: TextAlign.center,
                  ),
                ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEDFDF6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.psychology_outlined, color: Color(0xFF1E9E68), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Next: FARUMASI AI finds the best-matched pharmacies for your medicines',
                        style: TextStyle(fontSize: 11, color: Color(0xFF065F46), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _goToPharmacyStep,
                style: _primaryBtn,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.psychology_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('Find Best Pharmacy'),
                    SizedBox(width: 4),
                    Icon(Icons.chevron_right, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPharmacyOptionCard(
    ScoredPharmacyOption opt,
    List<ScoredPharmacyOption> allOptions,
  ) {
    final selected = _selectedPharmacy?.codename == opt.codename;
    final isBest = opt.rank == 1;
    final cardRoadKm = opt.roadDistanceKm > 0 ? opt.roadDistanceKm : 0.0;
    final cardDeliveryBlocked = _fulfillment == 'delivery' && !opt.deliveryAvailable;
    final cardDeliveryFee = _fulfillment == 'pickup'
        ? 0.0
        : _patientLat == null
            ? null
            : cardRoadKm > 0
                ? calcDeliveryFee(cardRoadKm)
                : 1500.0;
    final cardMedicineDue = opt.priceAfterInsurance;
    final cardDeliveryDue = cardDeliveryBlocked ? 0.0 : (cardDeliveryFee ?? 0.0);
    final cardOrderAmount = cardMedicineDue + cardDeliveryDue;
    final cardTotalToPay = cardDeliveryFee == null
        ? null
        : estimatedCheckoutTotalRwf(
            medicinesRwf: cardMedicineDue.round(),
            deliveryRwf: cardDeliveryDue.round(),
            deferDeliveryFee: false,
          ).toDouble();

    final whyParts = <String>[];
    if (isBest) {
      if (opt.availableCount == opt.totalCount) {
        whyParts.add('Full stock');
      } else {
        whyParts.add('${opt.availableCount}/${opt.totalCount} items available');
      }
      if (opt.insuranceMatch) whyParts.add('Insurance accepted');
      final isNearest = opt.distanceKm > 0 &&
          allOptions.every(
            (o) => o == opt || o.distanceKm == 0 || o.distanceKm >= opt.distanceKm,
          );
      if (isNearest) whyParts.add('Nearest option');
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEDFDF6) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFF1E9E68) : const Color(0xFFE2E8F0),
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
              onTap: () => setState(() => _selectedPharmacy = opt),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          backgroundColor:
                              isBest ? const Color(0xFF1E9E68) : const Color(0xFFF1F5F9),
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
                              Wrap(
                                spacing: 8,
                                runSpacing: 4,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text(
                                    'Pharmacy ${opt.codename}',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  if (isBest)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF1E9E68),
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
                                  if (!isBest)
                                    Text(
                                      '${opt.matchPercent}% match',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey.shade500,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.location_on_outlined,
                                      size: 14, color: Colors.grey.shade600),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      '${opt.pharmacy.district}'
                                      '${cardRoadKm > 0 ? ' · ~${cardRoadKm.toStringAsFixed(1)} km est. road' : ''}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (opt.insuranceMatch)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCFCE7),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Text(
                                      'Insurance accepted',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF166534),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              if (whyParts.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    'Why: ${whyParts.take(3).join(' · ')}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF1E9E68),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Container(
                          width: 20,
                          height: 20,
                          margin: const EdgeInsets.only(top: 2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: selected
                                  ? const Color(0xFF1E9E68)
                                  : const Color(0xFFCBD5E1),
                              width: 2,
                            ),
                            color: selected ? const Color(0xFF1E9E68) : Colors.transparent,
                          ),
                          child: selected
                              ? Center(
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                )
                              : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: opt.availability.map((med) {
                        final name = med.medicineName.length > 18
                            ? '${med.medicineName.substring(0, 17)}…'
                            : med.medicineName;
                        Color bg;
                        Color fg;
                        if (!med.available) {
                          bg = const Color(0xFFFEE2E2);
                          fg = const Color(0xFFDC2626);
                        } else if (med.stockStatus == 'low_stock') {
                          bg = const Color(0xFFFEF3C7);
                          fg = const Color(0xFFB45309);
                        } else {
                          bg = const Color(0xFFDCFCE7);
                          fg = const Color(0xFF166534);
                        }
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: bg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                med.available ? Icons.check_circle : Icons.cancel,
                                size: 12,
                                color: fg,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                med.stockStatus == 'low_stock' ? '$name (low)' : name,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: fg,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(Icons.medication_outlined,
                            size: 14, color: Color(0xFF1E9E68)),
                        const SizedBox(width: 4),
                        Text(
                          '${opt.availableCount}/${opt.totalCount} medicines',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                        ),
                        if (cardRoadKm > 0) ...[
                          const SizedBox(width: 12),
                          const Icon(Icons.navigation_outlined,
                              size: 14, color: Color(0xFF1E9E68)),
                          const SizedBox(width: 4),
                          Text(
                            '~${cardRoadKm.toStringAsFixed(1)} km est. road',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF1E9E68),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        if (opt.distanceRank > 0) ...[
                          const SizedBox(width: 12),
                          Text(
                            '#${opt.distanceRank} nearest',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        children: [
                          _priceRow('Medicine subtotal', formatRwf(opt.priceEstimate),
                              strike: opt.insuranceMatch),
                          if (opt.insuranceMatch && opt.insuranceSaving > 0)
                            _priceRow(
                              'Insurance savings',
                              '−${formatRwf(opt.insuranceSaving)}',
                              bg: const Color(0xFFF0FDF4),
                              valueColor: const Color(0xFF166534),
                            ),
                          if (opt.insuranceMatch)
                            _priceRow(
                              'You pay (medicines)',
                              formatRwf(cardMedicineDue),
                              bold: true,
                            ),
                          if (_fulfillment == 'delivery')
                            _priceRow(
                              'Delivery fee${cardRoadKm > 0 ? ' (~${cardRoadKm.toStringAsFixed(1)} km)' : ''}',
                              cardDeliveryBlocked
                                  ? 'Pickup only'
                                  : cardDeliveryFee == null
                                      ? 'Enable location'
                                      : cardDeliveryFee > 0
                                          ? formatRwf(cardDeliveryFee)
                                          : 'Free',
                              bg: cardDeliveryBlocked
                                  ? const Color(0xFFFFFBEB)
                                  : const Color(0xFFF5F3FF),
                              valueColor: cardDeliveryBlocked
                                  ? const Color(0xFF92400E)
                                  : const Color(0xFF5B21B6),
                            ),
                          if (_fulfillment == 'pickup')
                            _priceRow(
                              'Pickup',
                              'No delivery fee',
                              bg: const Color(0xFFF0FDF4),
                              valueColor: const Color(0xFF166534),
                            ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: const BoxDecoration(
                              color: Color(0xFFF8FAFC),
                              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Estimated total to pay',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                                Text(
                                  cardDeliveryBlocked && _fulfillment == 'delivery'
                                      ? '—'
                                      : cardTotalToPay == null
                                          ? '—'
                                          : formatRwf(cardTotalToPay),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1E9E68),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (cardTotalToPay != null && cardOrderAmount > 0)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                              child: Text(
                                'Includes ~$paymentProcessingFeePercent% processing fee on ${formatRwf(cardOrderAmount)} order',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: OutlinedButton.icon(
                onPressed: () => showPharmacyMatchDetails(
                  context,
                  option: opt,
                  allOptions: allOptions,
                  fulfillment: _fulfillment,
                  patientLocation: _patientLat != null && _patientLon != null
                      ? [_patientLat!, _patientLon!]
                      : null,
                  patientDistrict: _patientDistrict,
                ),
                icon: const Icon(Icons.info_outline, size: 16),
                label: const Text('View match details'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF1E9E68),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _priceRow(
    String label,
    String value, {
    bool strike = false,
    bool bold = false,
    Color? bg,
    Color? valueColor,
  }) {
    return Container(
      color: bg,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade700,
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: bold ? FontWeight.bold : FontWeight.w600,
              color: valueColor ?? (strike ? Colors.grey : const Color(0xFF1E293B)),
              decoration: strike ? TextDecoration.lineThrough : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPharmacyStep(List<CartItem> items) {
    final options = _pharmacyOptions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              Expanded(
                child: _FulfillmentChip(
                  label: 'Delivery',
                  icon: Icons.delivery_dining_outlined,
                  selected: _fulfillment == 'delivery',
                  onTap: () {
                    setState(() {
                      _fulfillment = 'delivery';
                      _selectedPharmacy = null;
                      _pharmaReady = false;
                    });
                    if (_patientLat == null) _requestPatientLocation();
                    _startAiAnimation();
                  },
                ),
              ),
              Expanded(
                child: _FulfillmentChip(
                  label: 'Pickup',
                  icon: Icons.store_outlined,
                  selected: _fulfillment == 'pickup',
                  onTap: () => setState(() {
                    _fulfillment = 'pickup';
                    _selectedPharmacy = null;
                    _pharmaReady = false;
                    _startAiAnimation();
                  }),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_fulfillment == 'delivery' && !_deliveryLocationReady)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                const Icon(Icons.my_location, color: Color(0xFF92400E)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _locationDenied
                        ? 'Allow location to see delivery fees.'
                        : 'Enable location for accurate delivery pricing.',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                  ),
                ),
                TextButton(
                  onPressed: _locationLoading ? null : _requestPatientLocation,
                  child: Text(_locationLoading ? '…' : 'Enable'),
                ),
              ],
            ),
          ),
        if (_fulfillment == 'delivery' && !_deliveryLocationReady)
          const SizedBox(height: 8),
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
                  _aiPhase >= 1 && _aiPhase <= 4
                      ? [
                          'Checking stock at ${_pharmacyList.length} pharmacies…',
                          'Analyzing your medicines…',
                          _patientLat != null ? 'Using your GPS location…' : 'Using district for proximity…',
                          'Ranking by stock · price · distance · expiry…',
                        ][_aiPhase - 1]
                      : 'Finding best pharmacies…',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: _aiPhase >= 1 ? (_aiPhase.clamp(1, 5) - 1) / 4 : null,
                  color: const Color(0xFF1E9E68),
                ),
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
          ...options.map((opt) => _buildPharmacyOptionCard(opt, options)),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: _selectedPharmacy != null && _pharmaReady && _deliveryLocationReady
                ? _enterDetailsStep
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

  Widget _detailsSectionCard({
    required String title,
    String? subtitle,
    required List<Widget> children,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF334155),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _fieldLabel(String label, {bool required = false, String? hint}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.6,
              ),
              children: [
                TextSpan(text: label.toUpperCase()),
                if (required)
                  const TextSpan(
                    text: ' *',
                    style: TextStyle(color: Color(0xFFF87171)),
                  ),
              ],
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 2),
            Text(hint, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ],
      ),
    );
  }

  InputDecoration _portalFieldDecoration({String? hint}) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFF1E9E68), width: 2),
      ),
    );
  }

  Widget _buildDetailsOrderSummary(List<CartItem> items) {
    final selected = _selectedPharmacy;
    final subtotalMin = _catalogueSubtotalMin(items);
    final subtotalMax = _catalogueSubtotalMax(items);
    final hasCatalogRange = subtotalMax > subtotalMin + 0.5;
    final medicineDue = _medicinesTotal(items);
    final insuranceSaving = selected?.insuranceSaving ?? 0;

    return _detailsSectionCard(
      title: 'Order estimate',
      children: [
        ...items.map((item) {
          final unitLabel = item.sellMode == SellMode.partial
              ? (item.medicine.partialUnitName ?? 'unit')
              : 'pack';
          ({double min, double max})? lineTotal;
          if (selected != null) {
            final entry = _listingsMap[selected.pharmacy.id]?[item.medicine.id];
            final unit = cartLineUnitPriceFromListing(
              item.medicine,
              item.sellMode,
              entry != null ? (price: entry.price, unitPrice: entry.unitPrice) : null,
            );
            if (unit > 0) {
              final total = unit * item.quantity;
              lineTotal = (min: total, max: total);
            }
          } else {
            lineTotal = lineTotalPriceRange(
              item.medicine,
              item.sellMode,
              item.quantity,
              _listingPriceMap,
            );
          }
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                      children: [
                        TextSpan(text: item.medicine.name),
                        TextSpan(
                          text: ' ×${item.quantity} $unitLabel',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                if (lineTotal == null)
                  const Text(
                    'At pharmacy',
                    style: TextStyle(
                      fontSize: 11,
                      fontStyle: FontStyle.italic,
                      color: Color(0xFF94A3B8),
                    ),
                  )
                else if (lineTotal.min != lineTotal.max)
                  Text(
                    '${formatRwf(lineTotal.min)} – ${formatRwf(lineTotal.max)}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  )
                else
                  Text(
                    formatRwf(lineTotal.min),
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
              ],
            ),
          );
        }),
        const Divider(height: 20, color: Color(0xFFF1F5F9)),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Subtotal',
              style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
            Text(
              selected != null
                  ? formatRwf(selected.priceEstimate)
                  : hasCatalogRange
                      ? '${formatRwf(subtotalMin)} – ${formatRwf(subtotalMax)}'
                      : formatRwf(subtotalMin),
              style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF334155)),
            ),
          ],
        ),
        if (selected != null &&
            selected.insuranceMatch &&
            insuranceSaving > 0) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.shield_outlined, size: 16, color: Color(0xFF16A34A)),
                  SizedBox(width: 4),
                  Text(
                    'Insurance savings',
                    style: TextStyle(color: Color(0xFF16A34A), fontSize: 13),
                  ),
                ],
              ),
              Text(
                '−${formatRwf(insuranceSaving)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                ),
              ),
            ],
          ),
        ],
        if (selected != null || insuranceSaving > 0) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Medicines due',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              Text(
                formatRwf(medicineDue),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF1E9E68),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildDetailsStep(List<CartItem> items) {
    final isPickup = _fulfillment == 'pickup';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _stepHeader(
          isPickup ? 'Pickup details' : 'Delivery details',
          'Confirm your contact info before payment',
        ),
        if (_fulfillment == 'delivery' && !_deliveryLocationReady)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.navigation_outlined, size: 18, color: Color(0xFF92400E)),
                    SizedBox(width: 8),
                    Text(
                      'Enable location to continue',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF92400E),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _locationDenied
                      ? 'GPS is unavailable — choose pickup or enable location in settings.'
                      : 'Delivery requires GPS for accurate fees. We never show delivery as free without GPS.',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                ),
                TextButton(
                  onPressed: _locationLoading ? null : _requestPatientLocation,
                  child: Text(_locationLoading ? 'Detecting…' : 'Enable location'),
                ),
              ],
            ),
          ),
        if (isPickup)
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Color(0xFFDBEAFE)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.store_outlined, size: 18, color: Color(0xFF3B82F6)),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You chose pickup — no delivery fee. The pharmacy address is revealed after payment.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8)),
                  ),
                ),
              ],
            ),
          ),
        _detailsSectionCard(
          title: 'Contact details',
          children: [
            _fieldLabel('Full name', required: true),
            TextField(
              controller: _nameController,
              onChanged: (_) => setState(() {}),
              decoration: _portalFieldDecoration(hint: 'e.g. Amina Uwimana'),
            ),
            const SizedBox(height: 16),
            _fieldLabel('Phone', required: true),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              onChanged: (_) => setState(() {}),
              decoration: _portalFieldDecoration(hint: '+250 7XX XXX XXX'),
            ),
          ],
        ),
        if (!isPickup)
          _detailsSectionCard(
            title: 'Delivery address',
            children: [
              _fieldLabel('District', required: true),
              DropdownButtonFormField<String>(
                value: _deliveryDistrict.isEmpty ? null : _deliveryDistrict,
                decoration: _portalFieldDecoration(hint: 'Select district'),
                hint: const Text('Select district'),
                items: kigaliDeliveryDistrictList
                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                    .toList(),
                onChanged: (v) => setState(() {
                  _deliveryDistrict = v ?? '';
                  _deliveryHood = '';
                  _enforcePickupIfTooFar();
                }),
              ),
              const SizedBox(height: 6),
              const Text(
                'Delivery is available within Kigali City only (Gasabo, Nyarugenge, Kicukiro).',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 16),
              _fieldLabel('Neighbourhood / sector', required: true),
              SearchableSelect(
                value: _deliveryHood,
                onChanged: (v) => setState(() => _deliveryHood = v),
                options: hoodsForDistrict(_deliveryDistrict),
                placeholder: _deliveryDistrict.isEmpty
                    ? 'Select district first'
                    : 'Search or type your area…',
                disabled: _deliveryDistrict.isEmpty,
                allowCustom: true,
                emptyLabel: 'Type your neighbourhood above, then tap Use',
              ),
              const SizedBox(height: 6),
              const Text(
                'Can\'t find your area? Type it and choose "Use …" to add it.',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 16),
              _fieldLabel('Delivery notes', hint: '(optional)'),
              TextField(
                controller: _descriptionController,
                onChanged: (_) => setState(() {}),
                maxLines: 3,
                decoration: _portalFieldDecoration(hint: 'e.g. 2nd floor, blue gate…'),
              ),
            ],
          ),
        _detailsSectionCard(
          title: 'Verification code',
          subtitle:
              'Choose a short code you will share when receiving your order. It is not generated automatically.',
          children: [
            AccessCodeInputField(
              controller: _accessCodeController,
              isPickup: isPickup,
              onChanged: (_) => setState(() {}),
            ),
          ],
        ),
        _buildDetailsOrderSummary(items),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: _canContinueDetails
              ? () => setState(() => _step = CheckoutStep.payment)
              : null,
          style: _primaryBtn.copyWith(
            backgroundColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.disabled)) {
                return const Color(0xFFE2E8F0);
              }
              return const Color(0xFF1E9E68);
            }),
            foregroundColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.disabled)) {
                return const Color(0xFF94A3B8);
              }
              return Colors.white;
            }),
          ),
          child: const Text('Continue to Payment'),
        ),
      ],
    );
  }

  Widget _buildPaymentStep(List<CartItem> items) {
    final medicines = _medicinesTotal(items);
    final deliveryFee = _deliveryFeeFor(items) ?? 0;
    final isPickup = _fulfillment != 'delivery';
    final accessCode = _accessCodeController.text.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _detailsSectionCard(
          title: 'How would you like to pay?',
          subtitle: 'Pay with MTN MoMo, Airtel, or card on Flutterwave. Processing fee is added to your total.',
          children: [
            PaymentMethodSelector(
              selected: _paymentChannel,
              onChanged: (m) => setState(() => _paymentChannel = m),
            ),
          ],
        ),
        if (_paymentChannel.requiresPhone)
          _detailsSectionCard(
            title: 'Mobile number',
            subtitle: 'Used for mobile money on Flutterwave.',
            children: [
              TextField(
                key: ValueKey(_paymentChannel),
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: _portalFieldDecoration(hint: 'e.g. 0781234567'),
              ),
            ],
          )
        else
          _detailsSectionCard(
            title: 'Contact phone',
            subtitle: 'Optional — for your Flutterwave payment receipt.',
            children: [
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: _portalFieldDecoration(hint: 'e.g. 0781234567'),
              ),
            ],
          ),
        if (accessCode.length >= 4)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: AccessCodeSummaryCard(
              code: accessCode,
              isPickup: isPickup,
              onEdit: () => setState(() => _step = CheckoutStep.details),
            ),
          ),
        PaymentFeeBreakdown(
          subtotalRwf: medicines.round(),
          deliveryFeeRwf: deliveryFee.round(),
          deferDeliveryFee: _deferDeliveryFee && _fulfillment == 'delivery',
        ),
        if (_fulfillment == 'delivery' && !_deliveryLocationReady)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_off, color: Color(0xFF92400E)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _locationDenied
                        ? 'Enable location to place a delivery order.'
                        : 'Waiting for GPS…',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                  ),
                ),
                TextButton(
                  onPressed: _locationLoading ? null : _requestPatientLocation,
                  child: const Text('Enable'),
                ),
              ],
            ),
          ),
        if (_fulfillment == 'delivery' && deliveryFee > 0) ...[
          const SizedBox(height: 16),
          _detailsSectionCard(
            title: 'Delivery fee',
            children: [
              RadioListTile<bool>(
                value: false,
                groupValue: _deferDeliveryFee,
                onChanged: (v) => setState(() => _deferDeliveryFee = v ?? false),
                title: Text('Pay now (${deliveryFee.round()} RWF)'),
                contentPadding: EdgeInsets.zero,
              ),
              RadioListTile<bool>(
                value: true,
                groupValue: _deferDeliveryFee,
                onChanged: (v) => setState(() => _deferDeliveryFee = true),
                title: const Text('Pay after delivery'),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
        ],
        if (_selectedPharmacy != null) ...[
          const SizedBox(height: 12),
          Text(
            'Pharmacy ${_selectedPharmacy!.codename} · name revealed after payment',
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _isSubmitting ? null : () => _submitPayment(items),
          style: _primaryBtn,
          child: Text(_isSubmitting ? 'Processing…' : 'Continue to Flutterwave'),
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
        if (_accessCodeController.text.trim().length >= 4) ...[
          const SizedBox(height: 20),
          AccessCodeSummaryCard(
            code: _accessCodeController.text.trim(),
            isPickup: _fulfillment != 'delivery',
          ),
        ],
        const SizedBox(height: 32),
        if (_confirmedOrderId != null)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                final orderId = _confirmedOrderId!;
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => OrderDetailScreen(orderId: orderId)),
                );
              },
              style: _primaryBtn,
              child: const Text('Track order'),
            ),
          ),
        const SizedBox(height: 12),
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

Widget _productThumbPlaceholder(double size) {
  return Container(
    width: size,
    height: size,
    color: const Color(0xFFEDFDF6),
    child: const Icon(Icons.medication, color: Color(0xFF1E9E68)),
  );
}

class _FulfillmentChip extends StatelessWidget {
  const _FulfillmentChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? Colors.white : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: selected ? const Color(0xFF1E9E68) : const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: selected ? const Color(0xFF1E9E68) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartLineCard extends StatelessWidget {
  const _CartLineCard({
    required this.item,
    required this.onDecrement,
    required this.onIncrement,
    required this.onRemove,
  });

  final CartItem item;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;
  final VoidCallback onRemove;

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
            child: item.medicine.imageUrl.isNotEmpty
                ? Image.network(
                    item.medicine.imageUrl,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _productThumbPlaceholder(56),
                  )
                : _productThumbPlaceholder(56),
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
                  Row(
                    children: [
                      IconButton(
                        onPressed: onDecrement,
                        icon: const Icon(Icons.remove_circle_outline, size: 20),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      IconButton(
                        onPressed: onIncrement,
                        icon: const Icon(Icons.add_circle_outline, size: 20),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      IconButton(
                        onPressed: onRemove,
                        icon: Icon(Icons.delete_outline, size: 18, color: Colors.red.shade400),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
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
    this.deliveryLabel,
    this.subtotalLabel = 'Subtotal (est.)',
    this.totalLabel = 'Total (est.)',
  });

  final double subtotalMin;
  final double subtotalMax;
  final double deliveryFee;
  final String? deliveryLabel;
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
          _row('Delivery', deliveryLabel ?? (deliveryFee == 0 ? 'Free' : '${deliveryFee.round()} RWF')),
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

Widget _confirmAmountRow(String label, String value, {bool bold = false}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: bold ? 14 : 13,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              color: bold ? const Color(0xFF0F172A) : const Color(0xFF64748B),
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: bold ? 16 : 13,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: bold ? const Color(0xFF1E9E68) : const Color(0xFF334155),
          ),
        ),
      ],
    ),
  );
}

class _WizardStep {
  const _WizardStep(this.label, this.icon);
  final String label;
  final IconData icon;
}

