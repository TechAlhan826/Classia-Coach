# FitAura Backend - CORS & Configuration Summary

## 🎯 What Was Fixed

### ✅ CORS Configuration
- **Removed** all unnecessary ports (5174, 8080, etc.)
- **Simplified** to only essential ports:
  - Dev: `localhost:3000`, `localhost:5173` + mobile apps
  - Prod: `coach.classialongevity.com`, `fitaura-admin.vercel.app`
- **Added** proper preflight request handling (`OPTIONS` method)
- **Enabled** credentials support for both web and mobile

### ✅ Middleware Order (Critical Fix)
- CORS now applied **before** all other middleware
- Preflight requests handled automatically
- Error handling at the **very end** of middleware stack
- Rate limiting applied correctly

### ✅ Database Connection Handling
- Better error logging for connection failures
- Graceful shutdown support

---

## 🚀 Quick Start

### Development
```bash
cd "c:\flutter_projects\Fit Aura Project\Backend_FitAura"
npm install  # if not done
npm run dev
```

Output should show:
```
✅ FitAura Backend Server Started!

📡 Port: 5000
🔧 Environment: development
🌐 CORS: http://localhost:3000, http://localhost:5173 + Mobile Apps
🔑 API Base: http://localhost:5000/api
🧪 Test: http://localhost:5000/test
```

### Production
```bash
NODE_ENV=production npm run start:prod
```

---

## 🌐 CORS Allowed Origins

### Development (NODE_ENV=development)
- ✅ `http://localhost:3000` - Web admin
- ✅ `http://localhost:5173` - Web admin (Vite)
- ✅ Mobile apps (no Origin header, so no restrictions)
- ✅ Postman, cURL (no Origin header)

### Production (NODE_ENV=production)
- ✅ `https://coach.classialongevity.com`
- ✅ `https://fitaura-admin.vercel.app`

---

## 🔧 API Configuration for Different Clients

### Flutter Mobile App
```dart
import 'package:dio/dio.dart';

Dio dio = Dio(
  BaseOptions(
    baseUrl: 'http://localhost:5000', // dev
    // or baseUrl: 'https://coach.classialongevity.com', // prod
    connectTimeout: Duration(seconds: 30),
    receiveTimeout: Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
      // No Origin header needed - Flutter doesn't send it
      // Authorization header will be added per request
    },
  ),
);

// Login example
final response = await dio.post('/api/auth/login', data: {
  'email': 'user@example.com',
  'password': 'password123',
  'loginType': 'EMAIL',
  'user_id': 'unique_user_id',
});
```

### Web Admin (React/Vue/Angular)
```javascript
// Just fetch normally - CORS is configured
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // If using cookies
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'password123',
    loginType: 'EMAIL',
    user_id: 'admin_id'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Postman
- Just use the endpoint URL
- No special headers needed
- No CORS issues (Postman doesn't enforce CORS)

---

## ⚠️ If You Get "Database Connection Error"

**Symptom:** Works in Postman but fails in mobile app

**Reasons:**
1. Database not connected when query runs
2. Connection pooling issue (especially with Render/Vercel)
3. Mobile app sending malformed request

**Solutions:**

**Option 1: Check backend logs**
```bash
# Make sure you see this:
# ✅ MongoDB connected successfully
```

**Option 2: Add retry logic to your Flutter app**
```dart
Future<dynamic> loginWithRetry(String email, String password) async {
  int retries = 0;
  while (retries < 3) {
    try {
      return await dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
        'loginType': 'EMAIL',
        'user_id': email,
      });
    } catch (e) {
      retries++;
      if (retries >= 3) rethrow;
      await Future.delayed(Duration(seconds: 1));
    }
  }
}
```

**Option 3: Increase MongoDB connection timeout**
Already configured in `src/config/db.js`:
- `serverSelectionTimeoutMS: 10000` (10 seconds)
- `connectTimeoutMS: 10000`
- `socketTimeoutMS: 45000`

---

## 📋 Endpoints Reference

| Method | Endpoint | Auth Required | Notes |
|--------|----------|---|---|
| POST | `/api/auth/login` | ❌ | No auth needed |
| POST | `/api/auth/register` | ❌ | No auth needed |
| GET | `/api/auth/admin/users` | ✅ | Admin only |
| POST | `/api/daily-checkin` | ✅ | User |
| POST | `/api/weekly-checkin` | ✅ | User |
| POST | `/api/target/bulk` | ✅ | User |
| GET | `/api/exercises` | ✅ | User |
| GET | `/api/reports` | ✅ | User |
| GET | `/test` | ❌ | Health check |

---

## 🧪 Testing

### Test Backend Health
```bash
curl http://localhost:5000/test
```

Expected response:
```json
{"message": "Test route working", "timestamp": "2026-05-16T10:00:00.000Z"}
```

### Test Login Endpoint
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","loginType":"EMAIL","user_id":"user123"}'
```

### Test from Web (Chrome DevTools Console)
```javascript
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'pass123',
    loginType: 'EMAIL',
    user_id: 'user123'
  })
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error(e));
```

---

## 🔐 Environment Variables Required

```bash
# .env file
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fitaura
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

---

## 📝 Files Modified

1. **src/server.js** - Complete CORS overhaul
   - Simplified origin config (only needed ports)
   - Proper middleware ordering
   - Better error handling
   - Improved logging

2. **Created FLUTTER_INTEGRATION.md** - Flutter app setup guide
3. **Created this file** - Configuration summary

---

## ✨ Key Features

✅ **No CORS errors** for Flutter (mobile apps excluded from CORS)  
✅ **Clean dev setup** (localhost:3000, localhost:5173 only)  
✅ **Production ready** (specific domain whitelist)  
✅ **Proper preflight handling** (OPTIONS requests)  
✅ **Credentials support** (cookies, Authorization headers)  
✅ **Better error logging** (understand what's failing)  
✅ **Rate limiting** (prevents abuse)  
✅ **Security headers** (Helmet.js)  

---

## 🚨 Common Mistakes to Avoid

❌ **Don't** add `Origin` header manually in requests  
❌ **Don't** use `*` wildcard with credentials in production  
❌ **Don't** forget `Content-Type: application/json` header  
❌ **Don't** skip token validation with `Authorization: Bearer <token>`  
❌ **Don't** mix `http://` and `https://` inconsistently  
❌ **Don't** set `NODE_ENV=production` for development  

---

## 📞 Troubleshooting Checklist

- [ ] Backend running? (`npm run dev` in correct folder)
- [ ] Port 5000 accessible? (check with `curl http://localhost:5000/test`)
- [ ] Database connected? (check backend logs for "MongoDB connected")
- [ ] Frontend URL in allowed list? (localhost:3000 or 5173)
- [ ] Content-Type header set to `application/json`?
- [ ] Authorization token properly formatted? (`Bearer <token>`)
- [ ] No typos in endpoint URLs?
- [ ] Request body has all required fields?

If still having issues, check:
1. Backend logs for actual error message
2. Browser DevTools > Network tab (see full request/response)
3. Postman to isolate frontend vs backend issues

---

## 🎓 Understanding CORS

**Why Flutter doesn't have CORS issues:**
- CORS is a **browser security feature**
- Mobile apps are not browsers
- They don't send `Origin` header
- Backend allows requests without Origin

**Why web needs CORS:**
- Browsers enforce Same-Origin Policy
- Web app on localhost:3000 trying to reach localhost:5000 = different origin
- Browser blocks it unless server explicitly allows (CORS)

This setup handles both cases automatically!
