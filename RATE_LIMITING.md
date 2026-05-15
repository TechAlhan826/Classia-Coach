# Rate Limiting Configuration

This document explains the rate limiting setup implemented in the MyHealth API server.

## Overview

Rate limiting is implemented using the `express-rate-limit` package to protect the API from abuse and ensure fair usage.

## Configuration

### General Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP address per window
- **Applied to**: All routes except authentication routes

### Authentication Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 5 requests per IP address per window
- **Applied to**: `/api/auth` routes only
- **Purpose**: Prevent brute force attacks on authentication endpoints

## Response Headers

When rate limiting is active, the following headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

## Error Response

When a rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

Status Code: `429 Too Many Requests`

## Authentication Rate Limit Error

For authentication routes, the error message is:

```json
{
  "error": "Too many authentication attempts, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Implementation Details

### General Limiter
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes"
    });
  }
});
```

### Authentication Limiter
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes"
    });
  }
});
```

## Usage

The rate limiters are applied in the following order:

1. **General Limiter**: Applied to all routes via `app.use(limiter)`
2. **Authentication Limiter**: Applied specifically to auth routes via `app.use("/api/auth", authLimiter, authRoutes)`

## Testing Rate Limits

You can test the rate limiting by making multiple requests in quick succession:

```bash
# Test general rate limiting
for i in {1..105}; do
  curl -X GET "http://localhost:5000/api/plan?startDate=2025-07-28&endDate=2025-08-03"
done

# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST "http://localhost:5000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}'
done
```

## Customization

To modify rate limiting settings, update the configuration in `src/server.js`:

- Change `windowMs` to adjust the time window
- Change `max` to adjust the maximum requests per window
- Modify the error messages in the `handler` function
- Add additional limiters for specific routes if needed

## Security Benefits

1. **Prevents Brute Force Attacks**: Stricter limits on authentication endpoints
2. **Protects Against DDoS**: Limits requests per IP address
3. **Ensures Fair Usage**: Prevents single users from overwhelming the API
4. **Resource Protection**: Prevents server overload from excessive requests 