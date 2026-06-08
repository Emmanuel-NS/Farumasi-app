import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/repositories/auth_repository.dart';
import '../api/repositories/patient_repository.dart';
import '../core/router.dart';
import '../providers/auth_provider.dart';
import '../services/pin_service.dart';
import '../services/state_service.dart';
import '../widgets/portal/portal_ui.dart';
import 'data_privacy_screen.dart';
import 'help_screen.dart';
import 'terms_conditions_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String? _openSection;
  String _language = 'en';

  final Map<String, bool> _channels = {
    'push': true,
    'email': true,
    'sms': false,
    'whatsapp': false,
  };
  final Map<String, bool> _events = {
    'orders': true,
    'health_tips': true,
    'promotions': false,
    'app_updates': true,
    'reminders': true,
  };

  @override
  void initState() {
    super.initState();
    _openSection = 'notifications';
    PinService.instance.hydrate();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPreferences());
  }

  Future<void> _loadPreferences() async {
    if (!_isLoggedIn) return;
    try {
      final prefs = await PatientRepository.instance.fetchNotificationPreferences();
      if (!mounted) return;
      setState(() {
        _channels.addAll(prefs.channels);
        _events.addAll(prefs.events);
      });
    } catch (_) {}
  }

  Future<void> _savePreferences() async {
    if (!_isLoggedIn) return;
    try {
      await PatientRepository.instance.updateNotificationPreferences(
        NotificationPreferences(channels: Map.of(_channels), events: Map.of(_events)),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification preferences saved')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not save preferences')),
        );
      }
    }
  }

  bool get _isLoggedIn =>
      ref.read(authProvider).status == AuthStatus.authenticated ||
      StateService().isLoggedIn;

  void _toggle(String id) {
    setState(() => _openSection = _openSection == id ? null : id);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final userName = auth.user?.name ?? StateService().userName ?? 'Guest';

    return Scaffold(
      backgroundColor: PortalColors.pageBg,
      body: PortalPageShell(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const PortalPageHeader(
              title: 'Settings',
              subtitle: 'Manage notifications, security, and preferences.',
            ),
            const SizedBox(height: 20),
            PortalAccordionSection(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Channels and alert types',
              open: _openSection == 'notifications',
              onToggle: () => _toggle('notifications'),
              child: Column(
                children: [
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: PortalSectionLabel('Channels'),
                  ),
                  const SizedBox(height: 12),
                  _toggleRow(Icons.smartphone_outlined, 'Push notifications', 'push', _channels),
                  _toggleRow(Icons.mail_outline, 'Email', 'email', _channels),
                  _toggleRow(Icons.sms_outlined, 'SMS', 'sms', _channels),
                  _toggleRow(Icons.phone_outlined, 'WhatsApp', 'whatsapp', _channels),
                  const Divider(height: 28),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: PortalSectionLabel('Notification types'),
                  ),
                  const SizedBox(height: 12),
                  _toggleRow(null, 'Order updates', 'orders', _events),
                  _toggleRow(null, 'Health tips', 'health_tips', _events),
                  _toggleRow(null, 'Promotions', 'promotions', _events),
                  _toggleRow(null, 'App updates', 'app_updates', _events),
                  _toggleRow(null, 'Reminders', 'reminders', _events),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: _isLoggedIn ? _savePreferences : null,
                      child: const Text(
                        'Save preferences',
                        style: TextStyle(
                          color: PortalColors.green,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => setState(() {
                        for (final k in _channels.keys) {
                          _channels[k] = true;
                        }
                        for (final k in _events.keys) {
                          _events[k] = k != 'promotions';
                        }
                      }),
                      child: const Text(
                        'Reset to defaults',
                        style: TextStyle(
                          color: PortalColors.green,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PortalAccordionSection(
              icon: Icons.shield_outlined,
              title: 'Security',
              subtitle: 'Passcode, password, and sessions',
              open: _openSection == 'security',
              onToggle: () => _toggle('security'),
              child: Column(
                children: [
                  _PinManagerBlock(isLoggedIn: _isLoggedIn),
                  if (!_isLoggedIn)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Sign in to manage your password and active sessions.',
                        style: TextStyle(fontSize: 13, color: PortalColors.slate500),
                      ),
                    )
                  else ...[
                    PortalActionRow(
                      icon: Icons.lock_outline,
                      label: 'Change password',
                      onTap: () => _showChangePassword(context),
                    ),
                    PortalActionRow(
                      icon: Icons.verified_user_outlined,
                      label: 'Two-factor authentication',
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: PortalColors.slate100,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Coming soon',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                      onTap: null,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            PortalAccordionSection(
              icon: Icons.description_outlined,
              title: 'Data & Privacy',
              subtitle: 'Export your data or delete your account',
              open: _openSection == 'data',
              onToggle: () => _toggle('data'),
              child: Column(
                children: [
                  PortalActionRow(
                    icon: Icons.download_outlined,
                    label: 'Request a copy of my data',
                    description: 'We\'ll email a downloadable archive to your registered address.',
                    onTap: _isLoggedIn
                        ? () => ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Export requested — check your email.')),
                            )
                        : null,
                  ),
                  PortalActionRow(
                    icon: Icons.delete_forever_outlined,
                    label: 'Delete my account',
                    description: 'Permanently remove your profile and order history.',
                    destructive: true,
                    onTap: _isLoggedIn
                        ? () => Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const DataPrivacyScreen()),
                            )
                        : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PortalAccordionSection(
              icon: Icons.language,
              title: 'Preferences',
              subtitle: 'Language and display',
              open: _openSection == 'preferences',
              onToggle: () => _toggle('preferences'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const PortalSectionLabel('Language'),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.4,
                    children: [
                      _langTile('en', 'English'),
                      _langTile('rw', 'Kinyarwanda'),
                      _langTile('fr', 'Français'),
                      _langTile('sw', 'Swahili'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PortalAccordionSection(
              icon: Icons.info_outline,
              title: 'About & Legal',
              subtitle: 'Help, terms, and policies',
              open: _openSection == 'about',
              onToggle: () => _toggle('about'),
              child: Column(
                children: [
                  PortalActionRow(
                    icon: Icons.help_outline,
                    label: 'Help & Support',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const HelpScreen()),
                    ),
                  ),
                  PortalActionRow(
                    icon: Icons.article_outlined,
                    label: 'Terms & Conditions',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const TermsConditionsScreen()),
                    ),
                  ),
                  PortalActionRow(
                    icon: Icons.privacy_tip_outlined,
                    label: 'Privacy Policy',
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DataPrivacyScreen()),
                    ),
                  ),
                ],
              ),
            ),
            if (_isLoggedIn) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: PortalColors.cardBorder),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: PortalColors.greenLight,
                      child: Text(
                        userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                        style: const TextStyle(
                          color: PortalColors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        userName,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        ref.read(authProvider.notifier).logout();
                        context.go(AppRoutes.home);
                      },
                      child: const Text(
                        'Sign out',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => context.go(AppRoutes.auth),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PortalColors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Sign in to your account'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _toggleRow(IconData? icon, String label, String key, Map<String, bool> map) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: PortalColors.slate500),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 14, color: PortalColors.slate700)),
          ),
          PortalToggle(
            value: map[key] ?? false,
            onChanged: (v) => setState(() => map[key] = v),
          ),
        ],
      ),
    );
  }

  Widget _langTile(String code, String label) {
    final selected = _language == code;
    return GestureDetector(
      onTap: () => setState(() => _language = code),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? PortalColors.greenLight : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? PortalColors.green : PortalColors.slate200,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selected ? PortalColors.green : PortalColors.slate700,
                ),
              ),
            ),
            if (selected) const Icon(Icons.check, size: 16, color: PortalColors.green),
          ],
        ),
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    final current = TextEditingController();
    final next = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
            ),
            TextField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              try {
                await AuthRepository().changePassword(
                  currentPassword: current.text,
                  newPassword: next.text,
                );
                if (ctx.mounted) Navigator.pop(ctx);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password updated')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Could not change password: $e')),
                  );
                }
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }
}

class _PinManagerBlock extends StatefulWidget {
  const _PinManagerBlock({required this.isLoggedIn});

  final bool isLoggedIn;

  @override
  State<_PinManagerBlock> createState() => _PinManagerBlockState();
}

class _PinManagerBlockState extends State<_PinManagerBlock> {
  @override
  void initState() {
    super.initState();
    PinService.instance.addListener(_onPin);
  }

  @override
  void dispose() {
    PinService.instance.removeListener(_onPin);
    super.dispose();
  }

  void _onPin() {
    if (mounted) setState(() {});
  }

  Future<void> _setPin() async {
    final c = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Set passcode'),
        content: TextField(
          controller: c,
          obscureText: true,
          keyboardType: TextInputType.number,
          maxLength: 8,
          decoration: const InputDecoration(
            hintText: '4–8 digits',
            counterText: '',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, c.text.length >= 4),
            style: ElevatedButton.styleFrom(backgroundColor: PortalColors.green),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (ok == true && c.text.length >= 4) {
      await PinService.instance.setPin(c.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoggedIn) {
      return const SizedBox.shrink();
    }
    final hasPin = PinService.instance.hasPin;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PortalColors.greenLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PortalColors.greenBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.shield_outlined, color: PortalColors.green, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Orders & Rx passcode',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: hasPin ? PortalColors.green : PortalColors.slate200,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  hasPin ? 'ON' : 'OFF',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: hasPin ? Colors.white : PortalColors.slate600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Require a passcode to view orders and prescriptions.',
            style: TextStyle(fontSize: 12, color: PortalColors.slate600),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              TextButton(
                onPressed: _setPin,
                child: Text(hasPin ? 'Change passcode' : 'Set passcode'),
              ),
              if (hasPin)
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const DataPrivacyScreen()),
                  ),
                  child: const Text('Remove'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
