import '../api_client.dart';

class AuthRepository {
  final _client = FarumasiApiClient.instance;

  Future<AuthResult> login({
    required String emailOrPhone,
    required String password,
  }) async {
    final response = await _client.dio.post('/auth/login', data: {
      'emailOrPhone': emailOrPhone,
      'password': password,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
    );

    return AuthResult.fromJson(data);
  }

  Future<AuthResult> register({
    required String name,
    required String password,
    String? email,
    String? phone,
    String role = 'PATIENT',
  }) async {
    final response = await _client.dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
      'role': role,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
    );

    return AuthResult.fromJson(data);
  }

  /// Exchanges a Supabase token (from phone OTP, etc.) for our API JWT
  Future<AuthResult> syncSupabaseToken(String supabaseToken) async {
    final response = await _client.dio.post('/auth/sync', data: {
      'supabaseToken': supabaseToken,
    });

    final data = response.data as Map<String, dynamic>;
    await _client.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
    );

    return AuthResult.fromJson(data);
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
      final response = await _client.dio.get('/auth/me');
      final data = response.data as Map<String, dynamic>;
      return AuthUser.fromJson(data['user']);
    } catch (e) {
      return null;
    }
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

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: json['user'] != null
          ? AuthUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }
}

class AuthUser {
  final String id;
  final String name;
  final String? email;
  final String? phone;
  final String role;
  final String? avatarUrl;

  const AuthUser({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.role,
    this.avatarUrl,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      role: json['role'] as String,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }
}
