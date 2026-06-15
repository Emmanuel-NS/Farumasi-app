import 'dart:convert';

import 'package:go_router/go_router.dart';

import '../core/router.dart';
import '../services/state_service.dart';

/// Deep-link targets encoded in local notification payloads.
class NotificationNavigation {
  NotificationNavigation._();

  static void Function(String payload)? onPayload;

  static void register(GoRouter router) {
    onPayload = (payload) => _handle(router, payload);
  }

  static void handle(String? payload) {
    if (payload == null || payload.isEmpty) return;
    onPayload?.call(payload);
  }

  static String encode({
    required String type,
    String? orderId,
    String? consultId,
    String? pharmacistId,
    bool consultAnonymous = false,
    int? homeTab,
    String? actionUrl,
  }) {
    return jsonEncode({
      't': type,
      if (orderId != null) 'orderId': orderId,
      if (consultId != null) 'consultId': consultId,
      if (pharmacistId != null) 'pharmacistId': pharmacistId,
      if (consultAnonymous) 'anon': true,
      if (homeTab != null) 'tab': homeTab,
      if (actionUrl != null) 'url': actionUrl,
    });
  }

  static void _handle(GoRouter router, String payload) {
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      final type = data['t'] as String? ?? 'general';

      switch (type) {
        case 'order':
          final orderId = data['orderId'] as String?;
          if (orderId != null && orderId.isNotEmpty) {
            router.push('/orders/$orderId');
          }
          return;
        case 'consult':
          final pharmacistId = data['pharmacistId'] as String?;
          if (pharmacistId != null && pharmacistId.isNotEmpty) {
            StateService().requestConsultOpen(
              pharmacistId: pharmacistId,
              consultId: data['consultId'] as String?,
              anonymous: data['anon'] as bool? ?? false,
            );
            router.go(AppRoutes.home);
          } else {
            StateService().requestHomeTab(2);
            router.go(AppRoutes.home);
          }
          return;
        case 'tab':
          final tab = data['tab'] as int?;
          if (tab != null) {
            StateService().requestHomeTab(tab);
            router.go(AppRoutes.home);
          }
          return;
        case 'url':
          _openActionUrl(router, data['url'] as String?);
          return;
        default:
          final url = data['url'] as String?;
          if (url != null) {
            _openActionUrl(router, url);
          }
      }
    } catch (_) {
      _openActionUrl(router, payload);
    }
  }

  static void _openActionUrl(GoRouter router, String? actionUrl) {
    if (actionUrl == null || actionUrl.isEmpty) return;

    final orderMatch = RegExp(r'/orders/([^/?#]+)').firstMatch(actionUrl);
    if (orderMatch != null) {
      router.push('/orders/${orderMatch.group(1)}');
      return;
    }

    if (actionUrl.contains('/consult')) {
      StateService().requestHomeTab(2);
      router.go(AppRoutes.home);
      return;
    }

    if (actionUrl.contains('/store')) {
      StateService().requestHomeTab(0);
      router.go(AppRoutes.home);
      return;
    }

    if (actionUrl.contains('/prescriptions')) {
      StateService().requestHomeTab(4);
      router.go(AppRoutes.home);
      return;
    }
  }
}
