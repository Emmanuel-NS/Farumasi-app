// lib/screens/rider/rider_payout_screen.dart
// Payout request screen for per-trip FARUMASI riders.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/repositories/rider_repository.dart';
import '../../models/rider_models.dart';
import '../../providers/rider_provider.dart';

const _kMtn = 'MTN MoMo';
const _kAirtel = 'Airtel Money';
const _kMinPayout = 500.0;

class RiderPayoutScreen extends ConsumerStatefulWidget {
  const RiderPayoutScreen({super.key});

  @override
  ConsumerState<RiderPayoutScreen> createState() => _RiderPayoutScreenState();
}

class _RiderPayoutScreenState extends ConsumerState<RiderPayoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mobileCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  String _paymentMethod = _kMtn;
  bool _isLoading = false;
  bool _success = false;
  String? _errorMsg;

  late double _maxAmount;

  @override
  void initState() {
    super.initState();
    final state = ref.read(riderProvider);
    _maxAmount = state.earnings.pendingPayout;
    _mobileCtrl.text = state.profile.phone;
    _amountCtrl.text = _maxAmount.toInt().toString();
  }

  @override
  void dispose() {
    _mobileCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      await RiderRepository().requestPayout(
        amount: double.parse(_amountCtrl.text.trim()),
        mobileNumber: _mobileCtrl.text.trim(),
        paymentMethod: _paymentMethod,
      );
      if (mounted) setState(() { _isLoading = false; _success = true; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMsg = 'Request failed. Please try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final earnings = ref.watch(riderProvider).earnings;
    _maxAmount = earnings.pendingPayout;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        leading: const BackButton(),
        title: const Text(
          'Request Payout',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: Colors.grey.shade100),
        ),
      ),
      body: _success ? _SuccessView(amount: _amountCtrl.text) : _buildForm(),
    );
  }

  Widget _buildForm() {
    return ListView(
      padding: const EdgeInsets.all(20),
      physics: const BouncingScrollPhysics(),
      children: [
        // Pending payout card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E9E68), Color(0xFF16875A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1E9E68).withValues(alpha: 0.25),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const Icon(Icons.account_balance_wallet,
                    color: Colors.white70, size: 15),
                const SizedBox(width: 6),
                const Text('Available for Payout',
                    style: TextStyle(color: Colors.white70, fontSize: 13)),
              ]),
              const SizedBox(height: 8),
              Text(
                '${_maxAmount.toInt()} RWF',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Min: ${_kMinPayout.toInt()} RWF per request',
                style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Amount field
              _fieldLabel('Amount (RWF)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _amountCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: _inputDecoration(
                  hint: 'Enter amount',
                  suffix: Text(
                    'Max ${_maxAmount.toInt()}',
                    style: TextStyle(
                        color: Colors.grey.shade500, fontSize: 12),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Enter an amount';
                  final val = double.tryParse(v);
                  if (val == null) return 'Invalid amount';
                  if (val < _kMinPayout) {
                    return 'Minimum payout is ${_kMinPayout.toInt()} RWF';
                  }
                  if (val > _maxAmount) {
                    return 'Cannot exceed available balance (${_maxAmount.toInt()} RWF)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Payment method
              _fieldLabel('Payout Method'),
              const SizedBox(height: 8),
              _PaymentMethodSelector(
                selected: _paymentMethod,
                onChanged: (v) => setState(() => _paymentMethod = v),
              ),
              const SizedBox(height: 20),

              // Mobile money number
              _fieldLabel('Mobile Money Number'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _mobileCtrl,
                keyboardType: TextInputType.phone,
                decoration: _inputDecoration(hint: '+250 7XX XXX XXX'),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Enter your mobile money number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 8),
              Text(
                'Funds will be sent to this number via $_paymentMethod.',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
              const SizedBox(height: 28),

              // Error message
              if (_errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline_rounded,
                          color: Colors.red.shade600, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorMsg!,
                          style: TextStyle(
                              color: Colors.red.shade700, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Submit button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _maxAmount < _kMinPayout
                        ? Colors.grey.shade400
                        : const Color(0xFF1E9E68),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  onPressed: (_isLoading || _maxAmount < _kMinPayout)
                      ? null
                      : _submit,
                  child: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _maxAmount < _kMinPayout
                              ? 'Insufficient Balance'
                              : 'Submit Payout Request',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'Processing may take 1–2 business days.',
                  style: TextStyle(
                      color: Colors.grey.shade400, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _fieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.black87,
      ),
    );
  }

  InputDecoration _inputDecoration({required String hint, Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey.shade400),
      suffix: suffix,
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1E9E68), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red.shade400),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red.shade400, width: 1.5),
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }
}

// ─── Payment method selector ──────────────────────────────────────────────────

class _PaymentMethodSelector extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const _PaymentMethodSelector({
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [_kMtn, _kAirtel].map((method) {
        final isSelected = selected == method;
        return Expanded(
          child: GestureDetector(
            onTap: () => onChanged(method),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: EdgeInsets.only(
                  right: method == _kMtn ? 8 : 0),
              padding: const EdgeInsets.symmetric(
                  vertical: 14, horizontal: 12),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFE8F5EE)
                    : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFF1E9E68)
                      : Colors.grey.shade200,
                  width: isSelected ? 1.5 : 1,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isSelected
                          ? const Color(0xFF1E9E68)
                          : Colors.grey.shade200,
                    ),
                    child: isSelected
                        ? const Icon(Icons.check,
                            color: Colors.white, size: 13)
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      method,
                      style: TextStyle(
                        fontWeight: isSelected
                            ? FontWeight.bold
                            : FontWeight.normal,
                        fontSize: 13,
                        color: isSelected
                            ? const Color(0xFF1E9E68)
                            : Colors.black87,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ─── Success view ─────────────────────────────────────────────────────────────

class _SuccessView extends StatelessWidget {
  final String amount;
  const _SuccessView({required this.amount});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Color(0xFFE8F5EE),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                size: 56,
                color: Color(0xFF1E9E68),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Request Submitted!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your payout request of $amount RWF has been\nsubmitted for processing.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.grey.shade600, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 6),
            Text(
              'Funds typically arrive within 1–2 business days.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.grey.shade400, fontSize: 13),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E9E68),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  'Back to Earnings',
                  style: TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
