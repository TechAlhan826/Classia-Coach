# MyHealth Backend API

A Node.js and MongoDB backend for MyHealth app with user authentication (register/login) and JWT-based access tokens.

## Features
- User registration and login
- JWT authentication for protected routes
- MongoDB integration via Mongoose

## Folder Structure
```
Backend_MyHealth_App/
  src/
    config/        # Database connection
    controllers/   # Route logic
    middleware/    # Auth middleware
    models/        # Mongoose models
    routes/        # Express routes
    server.js      # Main server file
  .env             # Environment variables
```

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root with:
   ```env
   MONGODB_URI=mongodb://localhost:27017/myhealth
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints
### Register
- `POST /api/auth/register`
- Body: `{ "name": "User", "email": "user@example.com", "password": "pass" }`
- Response: `{ "token": "..." }`

### Login
- `POST /api/auth/login`
- Body: `{ "email": "user@example.com", "password": "pass" }`
- Response: `{ "token": "..." }`

Use the returned token as a Bearer token in the `Authorization` header for protected routes. 