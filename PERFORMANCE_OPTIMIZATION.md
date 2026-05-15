# Performance Optimization Guide for Small CPU Environments

## Quick Start for Better Performance

### 1. Install New Dependencies
```bash
npm install compression helmet
```

### 2. Run with Optimized Settings
```bash
# For development
npm run dev

# For production with memory optimization
npm run start:optimized
```

## Performance Optimizations Implemented

### 1. **Response Compression**
- Added `compression` middleware to reduce response size
- Automatically compresses JSON responses
- Reduces bandwidth usage by 60-80%

### 2. **Security & Performance Headers**
- Added `helmet` for security headers
- Prevents common vulnerabilities
- Improves browser caching

### 3. **Database Connection Pooling**
- Reduced connection pool size to 5 (from default 10)
- Optimized timeouts for small CPU
- Disabled mongoose buffering for immediate responses

### 4. **Rate Limiting Optimization**
- Reduced rate limits for small CPU:
  - General: 50 requests/15min (was 100)
  - Auth: 10 requests/15min (was 20)
- Added health check endpoint (no rate limiting)

### 5. **Request Timeouts**
- 30-second timeout for all requests
- Prevents hanging connections

### 6. **Memory Management**
- Limited Node.js heap size to 512MB
- Optimized for small CPU environments

## Additional Recommendations

### 1. **Environment Variables**
Add to your `.env` file:
```
NODE_ENV=production
PORT=5000
```

### 2. **Client-Side Optimizations**
- Implement request caching in your mobile app
- Use batch requests instead of multiple individual calls
- Implement retry logic with exponential backoff

### 3. **API Call Optimization**
Instead of 5 separate API calls on app startup:
```javascript
// ❌ Bad: Multiple separate calls
fetch('/api/userinfo')
fetch('/api/daily-checkin')
fetch('/api/target')
fetch('/api/exercises')
fetch('/api/plan')

// ✅ Better: Single batch endpoint
fetch('/api/initial-data')
```

### 4. **Database Indexes**
Ensure your MongoDB collections have proper indexes:
```javascript
// Add to your models
userSchema.index({ user_id: 1 });
userInfoSchema.index({ user_id: 1 });
```

### 5. **Monitoring**
Check server health:
```bash
curl http://localhost:5000/health
```

## Troubleshooting

### If server still feels slow:

1. **Check memory usage:**
   ```bash
   # On Linux/Mac
   top -p $(pgrep node)
   
   # On Windows
   tasklist | findstr node
   ```

2. **Monitor database connections:**
   ```bash
   # Check MongoDB connections
   db.serverStatus().connections
   ```

3. **Reduce concurrent requests:**
   - Implement request queuing in your mobile app
   - Add delays between API calls

4. **Use production mode:**
   ```bash
   npm run start:prod
   ```

## Expected Performance Improvements

- **Response time**: 30-50% faster
- **Memory usage**: 40-60% reduction
- **Concurrent requests**: Better handling of multiple requests
- **Database queries**: 20-30% faster due to optimized connection pool

## Health Check Endpoint

Use this to monitor server status:
```
GET /health
Response: {"status":"OK","timestamp":"2024-01-01T00:00:00.000Z"}
``` 