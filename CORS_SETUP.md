# CORS Configuration Guide for FitAura Backend

## Overview
The backend is configured with comprehensive CORS (Cross-Origin Resource Sharing) support for both Flutter mobile apps and web admin applications.

## Current CORS Setup

### Development Mode (`NODE_ENV=development`)
In development, the server automatically allows requests from:

**Web Applications:**
- `http://localhost:3000` - React/Vue/Next.js default
- `http://localhost:3001` - Alternative web app port
- `http://localhost:4200` - Angular default
- `http://localhost:5173` - Vite default
- `http://localhost:8080` - Common dev port
- `http://localhost:8081` - Alternative dev port
- `http://127.0.0.1:*` - All localhost IPv4 addresses
- `*` - Wildcard for Flutter and mobile apps

**Mobile Applications:**
- Flutter apps (no origin restriction in dev)
- Postman and API testing tools

### Production Mode (`NODE_ENV=production`)
In production, only explicitly whitelisted origins are allowed:

```javascript
- https://coach.classialongevity.com
- ${WEB_ADMIN_URL} (from .env)
- ${FLUTTER_APP_URL} (from .env)
```

## Key Features

✅ **Preflight Request Handling** - Automatic OPTIONS method support
✅ **Credentials Support** - Cookies and Auth headers properly configured
✅ **Custom Headers** - Authorization, Content-Type, and custom headers allowed
✅ **Error Handling** - Specific CORS error responses with origin details
✅ **Dynamic Configuration** - Environment-aware origin whitelisting

## Allowed HTTP Methods
- GET
- POST
- PUT
- DELETE
- PATCH
- HEAD
- OPTIONS

## Allowed Headers
- Content-Type
- Authorization
- X-Requested-With
- Accept
- Origin
- Access-Control-Request-Method
- Access-Control-Request-Headers

## Exposed Headers
- Content-Length
- X-JSON-Response

## Troubleshooting

### Issue: "Access to XMLHttpRequest at ... has been blocked by CORS policy"

**Solution 1: Development Environment**
```bash
# Make sure NODE_ENV is NOT set to production
NODE_ENV=development npm run dev

# Or simply:
npm run dev
```

**Solution 2: Check Your Frontend URL**
- Verify your web app is running on one of the allowed localhost ports
- Common ports: 3000, 4200, 5173, 8080

**Solution 3: Production Environment**
- Update `.env` file with correct URLs:
  ```
  WEB_ADMIN_URL=https://youradmin.com
  FLUTTER_APP_URL=https://yourapp.com
  NODE_ENV=production
  ```

**Solution 4: Check Request Headers**
- Ensure Authorization header is properly formatted: `Authorization: Bearer <token>`
- Content-Type should be `application/json` for JSON requests

**Solution 5: Mobile/Flutter**
- Flutter apps should work without CORS restrictions by default
- If issues persist, check that API calls are going to the correct backend URL

### Issue: "CORS blocked request from origin"

**Cause:** Your frontend URL is not in the whitelist (production only)

**Solution:**
1. Verify your frontend is deployed at the correct URL
2. Add the URL to `WEB_ADMIN_URL` or `FLUTTER_APP_URL` in `.env`
3. Restart the server: `npm run start:prod`

## Environment Configuration

### Development
```bash
# No configuration needed - all localhost ports are automatically allowed
npm run dev
```

### Production
```bash
# Update .env file first
WEB_ADMIN_URL=https://admin.fitaura.com
FLUTTER_APP_URL=https://app.fitaura.com
NODE_ENV=production

# Then start:
npm run start:prod
```

## Testing CORS

### Using cURL (test from command line)
```bash
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:5000/api/auth/login
```

### Using Postman
1. Add `Origin` header manually: `http://localhost:3000`
2. Send request - should work without CORS errors

### Using Browser Console
```javascript
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('CORS Error:', err));
```

## Security Notes

⚠️ **Never use wildcard `*` in production with credentials enabled** - The current setup handles this safely by only using `*` in development.

✅ **Always use HTTPS in production** - Production URLs must be HTTPS only.

✅ **Whitelist specific domains** - Never allow unknown origins in production.

✅ **Validate origins dynamically** - The origin callback function validates each request.

## API Endpoints (No CORS Restrictions)

All endpoints are CORS-enabled. Common endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/admin/users` - Admin get users
- `POST /api/daily-checkin` - Create daily check-in
- `GET /api/exercises` - Get exercises list
- `GET /api/reports` - Get reports
- `POST /api/target/bulk` - Create targets

## Rate Limiting

Rate limiting is also configured per endpoint:
- **General endpoints:** 100 requests per 15 minutes
- **Auth endpoints:** 20 requests per 15 minutes (stricter)

This works alongside CORS and won't cause CORS errors.

## Support

If you continue experiencing CORS issues:
1. Check server logs for origin details
2. Verify frontend URL in browser dev tools (Network tab > Response headers)
3. Ensure backend is running in correct environment mode
4. Clear browser cache and try again
