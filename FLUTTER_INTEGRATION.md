# Flutter App Integration Guide

## ✅ Correct Setup for CORS-Free Communication

### 1. Backend Configuration (Server Side) ✓
- ✅ CORS enabled for all origins in **development mode**
- ✅ CORS allows localhost:3000 and localhost:5173 for web
- ✅ Mobile apps don't send `Origin` header, so no CORS restriction
- ✅ Credentials and Authorization headers properly configured

### 2. Flutter App Configuration (Client Side)

#### A. HTTP Client Setup (Recommended - Use Dio)

```dart
import 'package:dio/dio.dart';

class ApiService {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: 'http://localhost:5000', // or your actual backend URL
      connectTimeout: Duration(seconds: 30),
      receiveTimeout: Duration(seconds: 30),
      // ❌ DO NOT set origin header - Flutter doesn't send it anyway
      // ✅ CORS will work automatically
      headers: {
        'Content-Type': 'application/json',
        // Authorization will be added per request
      },
    ),
  );

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/login',
        data: {
          'email': email,
          'password': password,
          'loginType': 'EMAIL',
          'user_id': email, // or generate unique ID
        },
      );
      return response.data;
    } on DioException catch (e) {
      print('Login error: ${e.message}');
      print('Response: ${e.response?.data}');
      throw Exception('Login failed: ${e.message}');
    }
  }

  static Future<void> setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }
}
```

#### B. Using http package (Alternative)

```dart
import 'package:http/http.dart' as http;

Future<void> login(String email, String password) async {
  final url = Uri.parse('http://localhost:5000/api/auth/login');
  
  try {
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        // ✅ DON'T add Origin header - it's only for browsers
      },
      body: jsonEncode({
        'email': email,
        'password': password,
        'loginType': 'EMAIL',
        'user_id': email,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('Login success: ${data['token']}');
    } else {
      print('Login failed: ${response.statusCode}');
      print('Response: ${response.body}');
    }
  } catch (e) {
    print('Error: $e');
  }
}
```

#### C. Handling JWT Token

```dart
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const _tokenKey = 'auth_token';

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}

// Usage in API requests:
Future<void> makeAuthenticatedRequest() async {
  final token = await AuthService.getToken();
  
  final headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };
  
  // Make request with headers
}
```

### 3. Common Issues & Solutions

#### ❌ "Database Connection Error" but works in Postman

**Cause:** Database not yet connected when request arrives

**Solution:**
```dart
// ✅ Add retry logic
Future<T> withRetry<T>(
  Future<T> Function() action, {
  int maxRetries = 3,
  Duration delay = const Duration(seconds: 1),
}) async {
  for (int i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (e) {
      if (i < maxRetries - 1) {
        await Future.delayed(delay);
      } else {
        rethrow;
      }
    }
  }
  throw Exception('Max retries exceeded');
}

// Usage:
final response = await withRetry(() => _dio.post('/api/auth/login', data: data));
```

#### ❌ CORS Error in Flutter

**This shouldn't happen because Flutter doesn't send Origin header.** If you see it:
- Verify backend is running
- Check backend URL is correct
- Try with `http://` not `https://` for local dev
- Clear app cache and restart

#### ❌ Connection Timeout

**Solution:**
```dart
// Increase timeouts
_dio.options.connectTimeout = Duration(seconds: 60);
_dio.options.receiveTimeout = Duration(seconds: 60);
```

#### ❌ Certificate Error (if using HTTPS)

```dart
// For development only:
(_dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = 
  (HttpClient client) {
    client.badCertificateCallback = (X509Certificate cert, String host, int port) => true;
    return client;
  };
```

### 4. Environment-Specific Configuration

```dart
class Environment {
  static const String DEV = 'http://localhost:5000';
  static const String STAGING = 'https://staging-api.fitaura.com';
  static const String PROD = 'https://api.fitaura.com';
  
  static String getApiUrl() {
    const bool isProduction = bool.fromEnvironment('dart.vm.product');
    if (isProduction) {
      return PROD;
    }
    // Use STAGING by default in debug
    return STAGING;
  }
}

// Usage:
Dio _dio = Dio(
  BaseOptions(
    baseUrl: Environment.getApiUrl(),
  ),
);
```

### 5. Debugging Checklist

- [ ] Backend URL is correct (check with curl first)
- [ ] Backend is running on port 5000
- [ ] NODE_ENV is NOT set to production (for dev)
- [ ] Database is connected (check backend logs)
- [ ] Flutter app has internet permission in AndroidManifest.xml
- [ ] iOS app allows HTTP (add to Info.plist)
- [ ] Authorization token is properly formatted: `Bearer <token>`
- [ ] Request headers include `Content-Type: application/json`

### 6. Test Endpoint First

```dart
Future<void> testConnection() async {
  try {
    final response = await _dio.get('/test');
    print('✅ Backend connected: ${response.data}');
  } catch (e) {
    print('❌ Backend error: $e');
  }
}
```

## Backend Info

**Base URL:** `http://localhost:5000` (dev) or `https://coach.classialongevity.com` (prod)

**Available Endpoints:**
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user
- `GET /test` - Test connection

**Headers Required:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <your_jwt_token>"
}
```

## No CORS Restrictions

✅ Flutter mobile app will **never** have CORS issues because:
1. Mobile apps don't send `Origin` header
2. Backend allows requests with no origin
3. Credentials are sent via Authorization header
4. All needed headers are whitelisted
