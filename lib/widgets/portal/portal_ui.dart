import 'package:flutter/material.dart';

/// Design tokens aligned with farumasi_patient_portal (Tailwind farumasi/slate).
abstract final class PortalColors {
  static const green = Color(0xFF1E9E68);
  static const greenDark = Color(0xFF167B51);
  static const greenLight = Color(0xFFEDFDF6);
  static const greenBorder = Color(0xFFBBF7D0);
  static const pageBg = Color(0xFFF8FAFC);
  static const pageBgAlt = Color(0xFFF9FAFB);
  static const slate900 = Color(0xFF0F172A);
  static const slate800 = Color(0xFF1E293B);
  static const slate700 = Color(0xFF334155);
  static const slate600 = Color(0xFF475569);
  static const slate500 = Color(0xFF64748B);
  static const slate400 = Color(0xFF94A3B8);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate100 = Color(0xFFF1F5F9);
  static const cardBorder = Color(0xFFF1F5F9);
}

class PortalPageShell extends StatelessWidget {
  const PortalPageShell({
    super.key,
    required this.child,
    this.maxWidth = 672,
    this.padding = const EdgeInsets.fromLTRB(24, 24, 24, 96),
    this.backgroundColor = PortalColors.pageBg,
  });

  final Widget child;
  final double maxWidth;
  final EdgeInsets padding;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: backgroundColor,
      child: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: SingleChildScrollView(
              padding: padding,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class PortalPageHeader extends StatelessWidget {
  const PortalPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: PortalColors.slate900,
                  height: 1.2,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: PortalColors.slate500,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class PortalBackLink extends StatelessWidget {
  const PortalBackLink({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chevron_left, size: 16, color: PortalColors.slate500),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
            ),
          ],
        ),
      ),
    );
  }
}

class PortalSectionLabel extends StatelessWidget {
  const PortalSectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: PortalColors.slate500,
      ),
    );
  }
}

class PortalAccordionSection extends StatelessWidget {
  const PortalAccordionSection({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.open,
    required this.onToggle,
    required this.child,
    this.trailing,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool open;
  final VoidCallback onToggle;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: PortalColors.cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: PortalColors.greenLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, size: 20, color: PortalColors.green),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: PortalColors.slate900,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 12,
                            color: PortalColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (trailing != null) trailing!,
                  Icon(
                    open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: PortalColors.slate400,
                  ),
                ],
              ),
            ),
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: child,
            ),
        ],
      ),
    );
  }
}

class PortalToggle extends StatelessWidget {
  const PortalToggle({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 40,
        height: 24,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: value ? PortalColors.green : PortalColors.slate200,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Align(
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: 20,
            height: 20,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Color(0x22000000), blurRadius: 2, offset: Offset(0, 1)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PortalSegmentedControl extends StatelessWidget {
  const PortalSegmentedControl({
    super.key,
    required this.options,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: PortalColors.slate100,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(options.length, (i) {
          final selected = i == selectedIndex;
          return Padding(
            padding: EdgeInsets.only(right: i < options.length - 1 ? 0 : 0),
            child: GestureDetector(
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: selected
                      ? const [
                          BoxShadow(
                            color: Color(0x0D000000),
                            blurRadius: 4,
                            offset: Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  options[i],
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: selected ? PortalColors.green : PortalColors.slate500,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class PortalPillChip extends StatelessWidget {
  const PortalPillChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? PortalColors.green : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? PortalColors.green : PortalColors.slate200,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : PortalColors.slate600,
          ),
        ),
      ),
    );
  }
}

class PortalEmptyState extends StatelessWidget {
  const PortalEmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Column(
        children: [
          Icon(icon, size: 56, color: PortalColors.slate200),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: PortalColors.slate600,
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: PortalColors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}

class PortalContactCard extends StatelessWidget {
  const PortalContactCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: PortalColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: PortalColors.green),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(fontSize: 12, color: PortalColors.slate500)),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: PortalColors.slate800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PortalFaqTile extends StatefulWidget {
  const PortalFaqTile({super.key, required this.question, required this.answer});

  final String question;
  final String answer;

  @override
  State<PortalFaqTile> createState() => _PortalFaqTileState();
}

class _PortalFaqTileState extends State<PortalFaqTile> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => setState(() => _open = !_open),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: PortalColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.question,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: PortalColors.slate800,
                      ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(Icons.expand_more, color: PortalColors.slate400),
                  ),
                ],
              ),
              if (_open) ...[
                const SizedBox(height: 8),
                Text(
                  widget.answer,
                  style: const TextStyle(
                    fontSize: 14,
                    color: PortalColors.slate600,
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class PortalStatusBadge extends StatelessWidget {
  const PortalStatusBadge({super.key, required this.label, this.tone = PortalStatusTone.neutral});

  final String label;
  final PortalStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      PortalStatusTone.success => (PortalColors.greenLight, PortalColors.green),
      PortalStatusTone.warning => (const Color(0xFFFFF7ED), const Color(0xFFC2410C)),
      PortalStatusTone.info => (const Color(0xFFE0F2FE), const Color(0xFF0369A1)),
      PortalStatusTone.neutral => (PortalColors.slate100, PortalColors.slate600),
      PortalStatusTone.danger => (const Color(0xFFFEE2E2), const Color(0xFFDC2626)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

enum PortalStatusTone { success, warning, info, neutral, danger }

class PortalActionRow extends StatelessWidget {
  const PortalActionRow({
    super.key,
    required this.icon,
    required this.label,
    this.description,
    this.onTap,
    this.trailing,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final String? description;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Icon(icon, size: 18, color: destructive ? Colors.red : PortalColors.slate500),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: destructive ? Colors.red : PortalColors.slate800,
                      ),
                    ),
                    if (description != null)
                      Text(
                        description!,
                        style: const TextStyle(fontSize: 12, color: PortalColors.slate500),
                      ),
                  ],
                ),
              ),
              trailing ?? const Icon(Icons.chevron_right, size: 18, color: PortalColors.slate400),
            ],
          ),
        ),
      ),
    );
  }
}

String portalRelativeTime(DateTime date) {
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays == 1) return 'Yesterday';
  if (diff.inDays < 7) return '${diff.inDays} days ago';
  return '${date.day}/${date.month}/${date.year}';
}

PortalStatusTone portalOrderStatusTone(String status) {
  final s = status.toLowerCase();
  if (s.contains('deliver') || s == 'completed') return PortalStatusTone.success;
  if (s.contains('cancel') || s == 'rejected' || s == 'failed') {
    return PortalStatusTone.danger;
  }
  if (s.contains('ready') || s.contains('pickup')) return PortalStatusTone.info;
  if (s.contains('pending')) return PortalStatusTone.warning;
  return PortalStatusTone.neutral;
}
