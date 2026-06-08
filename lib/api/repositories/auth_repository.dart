import '../api_client.dart';

class AuthRepository {
  final _client = FarumasiApiClient.instance;

  Future<AuthResult> login({
    required String emailOrPhone,
    required String password,
  }) async {
    final response = await _client.dio.post('/auth/login', data: {
      'email': emailOrPhone.trim(),
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );

    final user = await getMe();
    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      user: user,
    );
  }

  Future<AuthResult> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'patient',
  }) async {
    final response = await _client.dio.post('/auth/register', data: {
      'full_name': name,
      'email': email,
      'phone': phone,
      'password': password,
      'role': role.toLowerCase(),
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
    );

    final user = await getMe();
    return AuthResult(
      accessToken: data['access_token'] as String,
      refreshToken: data['refresh_token'] as String,
      user: user,
    );
  }

  Future<void> logout() async {
    await _client.clearTokens();
  }

  Future<bool> get isLoggedIn async {
    final token = await _client.getAccessToken();
    return token != null;
  }

  Future<AuthUser?> getMe() async {
    try {
      final response = await _client.dio.get('/users/me');
      final data = response.data as Map<String, dynamic>;
      return AuthUser(
        id: data['id'] as String,
        name: data['full_name'] as String? ?? 'User',
        email: data['email'] as String?,
        phone: data['phone'] as String?,
        role: (data['role'] as String? ?? 'patient').toUpperCase(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<AuthUser> updateMe({
    String? fullName,
    String? email,
    String? phone,
  }) async {
    final response = await _client.dio.put('/users/me', data: {
      if (fullName != null) 'full_name': fullName,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
    });
    final data = response.data as Map<String, dynamic>;
    return AuthUser(
      id: data['id'] as String,
      name: data['full_name'] as String? ?? 'User',
      email: data['email'] as String?,
      phone: data['phone'] as String?,
      role: (data['role'] as String? ?? 'patient').toUpperCase(),
    );
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.dio.post('/auth/change-password', data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  Future<void> logoutEverywhere() async {
    await _client.dio.post('/auth/logout-everywhere');
    await _client.clearTokens();
  }

  Future<void> requestDataExport() async {
    await _client.dio.post('/users/me/export-data');
  }

  Future<void> deleteAccount({required String password}) async {
    await _client.dio.delete('/users/me', data: {'password': password});
    await _client.clearTokens();
  }
}

class AuthResult {
  final String accessToken;
  final String refreshToken;
  final AuthUser? user;

  const AuthResult({
    required this.accessToken,
    required this.refreshToken,
    this.user,
  });
}

class AuthUser {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String role;

  const AuthUser({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.role,
  });
}
