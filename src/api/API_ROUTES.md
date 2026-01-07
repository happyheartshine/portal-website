# API Routes Documentation

## Base URL
All routes are prefixed with `/api`

## Authentication

### Public Routes (No Auth Required)

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "EMPLOYEE"
  }
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/api/auth/reset/request`
Request password reset OTP.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a password reset OTP has been sent."
}
```

**Note:** In development, OTP is logged to console. Check server logs.

#### POST `/api/auth/reset/confirm`
Confirm password reset with OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully"
}
```

### Protected Routes (JWT Required)

#### GET `/api/auth/profile`
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "clxxx...",
  "name": "John Doe",
  "email": "user@example.com",
  "role": "EMPLOYEE",
  "ratePerOrder": 5.0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Admin Routes (ADMIN Role Required)

#### POST `/api/admin/users`
Create a new user (Admin only).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "EMPLOYEE",
  "tempPassword": "tempPassword123",
  "ratePerOrder": 5.0
}
```

**Response:**
```json
{
  "id": "clxxx...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "EMPLOYEE",
  "ratePerOrder": 5.0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### DELETE `/api/admin/users/:id`
Delete a user (Admin only). Uses soft delete (sets `isActive=false`).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "User has been deactivated successfully"
}
```

**Note:** Cannot delete admin users. Uses soft delete to preserve data integrity and audit trails.

## User Dashboard Routes (Authenticated)

#### GET `/api/me/dashboard`
Get user dashboard data for a month.

**Query Parameters:**
- `month` (optional): YYYY-MM format, defaults to current month

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "month": "2024-01",
  "salary": 1500.0,
  "totalDeductions": 50.0,
  "approvedOrders": 100,
  "ongoingRefunds": 3,
  "unreadWarnings": 2
}
```

#### GET `/api/me/orders/trends`
Get order trends over a date range.

**Query Parameters:**
- `range` (optional): 7, 15, or 30 days (default: 7)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "submitted": 10,
    "approved": 8
  },
  {
    "date": "2024-01-16",
    "submitted": 12,
    "approved": 10
  }
]
```

#### GET `/api/me/warnings`
Get user warnings with source tags.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": "clxxx...",
    "reason": "Late submission",
    "note": "Please submit on time",
    "sourceTag": "Warning from Manager John Doe",
    "deductionAmount": 10.0,
    "isRead": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "readAt": null
  }
]
```

#### POST `/api/me/warnings/:id/read`
Mark a warning as read.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "clxxx...",
  "isRead": true,
  "readAt": "2024-01-15T12:00:00.000Z"
}
```

## Health Check

#### GET `/api/health`
Health check endpoint (Public).

**Response:**
```json
{
  "ok": true
}
```

## Role-Based Access Control (RBAC)

### EMPLOYEE
- Can access own profile
- Can view own data only
- Cannot access admin endpoints

### MANAGER
- All EMPLOYEE capabilities
- Can approve team orders
- Can manage refunds
- Can issue warnings/deductions
- Can audit coupons
- Cannot access admin endpoints

### ADMIN
- All MANAGER capabilities
- Can create/delete users
- Can access analytics
- Can perform data purges

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["validation error messages"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

## Swagger Documentation

Interactive API documentation available at:
- **Development**: http://localhost:3001/docs

All endpoints are documented with request/response schemas and can be tested directly from Swagger UI.

## Authentication Flow

1. **Login**: POST `/api/auth/login` with email/password
2. **Store Tokens**: Save `access_token` and `refresh_token`
3. **Use Access Token**: Include in `Authorization: Bearer <access_token>` header
4. **Refresh Token**: When access token expires, use POST `/api/auth/refresh`
5. **Password Reset**: Use OTP flow via `/api/auth/reset/request` and `/api/auth/reset/confirm`

## Security Notes

- Access tokens expire in 15 minutes (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens expire in 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Password reset OTP expires in 10 minutes
- All passwords are hashed using bcrypt
- OTPs are hashed before storage
- Refresh tokens are stored in database and invalidated on password change
- Soft delete preserves data integrity and audit trails

