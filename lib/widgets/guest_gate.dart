import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../core/router.dart';

/// Matches Next.js `GuestGate` — guests see a friendly lock screen instead of the feature.
class GuestGate extends ConsumerWidget {
  const GuestGate({
    super.key,
    required this.child,
    this.feature = 'this feature',
    this.onBrowseStore,
  });

  final Widget child;
  final String feature;
  final VoidCallback? onBrowseStore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    if (auth.status == AuthStatus.unknown) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1E9E68)),
      );
    }

    if (auth.status == AuthStatus.authenticated) {
      return child;
    }

    return Container(
      color: Colors.white,
      width: double.infinity,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEDFDF6),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFACEfd4)),
                  ),
                  child: const Icon(
                    Icons.lock_outline,
                    size: 36,
                    color: Color(0xFF1E9E68),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Sign in required',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'You need a Farumasi account to access $feature. '
                  "It's free and takes under a minute.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 28),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton(
                      onPressed: () => context.go(AppRoutes.auth),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E9E68),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 12),
                    TextButton(
                      onPressed: () {
                        if (onBrowseStore != null) {
                          onBrowseStore!();
                        } else {
                          context.go(AppRoutes.home);
                        }
                      },
                      style: TextButton.styleFrom(
                        backgroundColor: const Color(0xFFF1F5F9),
                        foregroundColor: const Color(0xFF334155),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Browse Store',
                        style: TextStyle(fontWeight: FontWeight.w600),
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
}

final isGuestProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).status != AuthStatus.authenticated;
});
