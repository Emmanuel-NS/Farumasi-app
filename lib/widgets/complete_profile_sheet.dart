import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/repositories/auth_repository.dart';

/// Collect missing profile fields after Google (or other OAuth) sign-in.
Future<bool> showCompleteProfileSheet(
  BuildContext context, {
  required AuthUser user,
}) async {
  final needsPhone = user.phone == null || user.phone!.trim().length < 9;
  if (!needsPhone) return true;

  final phoneController = TextEditingController();
  var busy = false;
  String? error;

  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setSheetState) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            24,
            20,
            24,
            24 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Complete your profile',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Hi ${user.name.split(' ').first}, add your phone number so pharmacies and riders can reach you.',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  labelText: 'Phone number',
                  hintText: 'e.g. 0781234567',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 8),
                Text(
                  error!,
                  style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        final phone = phoneController.text.trim();
                        if (phone.length < 9) {
                          setSheetState(() => error = 'Enter a valid Rwanda phone number');
                          return;
                        }
                        setSheetState(() {
                          busy = true;
                          error = null;
                        });
                        try {
                          await AuthRepository().updateMe(phone: phone);
                          if (ctx.mounted) Navigator.pop(ctx, true);
                        } catch (_) {
                          setSheetState(() {
                            busy = false;
                            error = 'Could not save phone number. Try again.';
                          });
                        }
                      },
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1E9E68),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(busy ? 'Saving…' : 'Continue'),
              ),
            ],
          ),
        );
      },
    ),
  );

  phoneController.dispose();
  return ok == true;
}
