# Authentication System - Frontend Improvements

## Overview

This document outlines the improvements made to align the frontend authentication system with the backend API.

## Changes Made

### 1. Enhanced Token Refresh Mechanism (`src/lib/apiClient.js`)

#### Previous Issues:
- Potential infinite recursion with refresh token logic
- No check to prevent refresh during refresh
- Inadequate error handling
- Missing redirect guards

#### Improvements:
```javascript
// ✅ Fixed Issues:
1. Prevents recursive refresh calls by checking if request is already to /auth/refresh
2. Uses direct axios call for refresh to avoid interceptor recursion
3. Added pathname check to avoid redirect loops on login page
4. Better error logging and handling
5. Properly clears tokens on refresh failure
```

**Key Changes:**
- Added check: `!originalRequest.url.includes('/auth/refresh')` to prevent recursion
- Used `axios.post()` directly instead of `api.post()` for refresh calls
- Added `window.location.pathname !== '/login'` check before redirects
- Enhanced error logging throughout

### 2. Improved Auth Context (`src/contexts/AuthContext.jsx`)

#### Changes to `refreshUser()`:
```javascript
// ✅ Structured user profile with explicit field mapping
const userProfile = {
  id: userData.id,
  email: userData.email,
  name: userData.name,
  role: userData.role,
  ratePerOrder: userData.ratePerOrder || null,
  isActive: userData.isActive,
  createdAt: userData.createdAt,
  updatedAt: userData.updatedAt
};
```

**Benefits:**
- Ensures consistent user object structure
- Makes expected fields explicit
- Handles optional fields gracefully
- Better null handling

#### Changes to `login()`:
```javascript
// ✅ Added validation and error handling
if (!access_token || !refresh_token || !userData) {
  throw new Error('Invalid response from server');
}

// ✅ Clear partial state on error
clearTokens();
setUser(null);
```

**Benefits:**
- Validates server response structure
- Cleans up partial auth state on errors
- Better error message extraction
- Prevents invalid auth states

#### Changes to `logout()`:
```javascript
// ✅ Clear and documented logout flow
1. Clear user state
2. Clear tokens from storage
3. Redirect to login
```

**Benefits:**
- Explicit step-by-step process
- Ensures complete cleanup
- Clear code comments

### 3. Enhanced Auth Helpers (`src/lib/auth.js`)

#### Added Error Handling:
```javascript
// ✅ Try-catch blocks for sessionStorage operations
try {
  return sessionStorage.getItem('access_token');
} catch (error) {
  console.error('Error reading access token:', error);
  return null;
}
```

**Benefits:**
- Handles sessionStorage quota exceeded errors
- Handles incognito/private mode restrictions
- Graceful degradation
- Better error logging

#### Improved `setTokens()`:
```javascript
// ✅ Individual token validation
if (accessToken) {
  sessionStorage.setItem('access_token', accessToken);
}
if (refreshToken) {
  sessionStorage.setItem('refresh_token', refreshToken);
}
```

**Benefits:**
- Allows setting tokens individually
- Prevents null/undefined storage
- Useful for refresh token flow (only updates access token)

### 4. Enhanced API Validation (`src/lib/apiClient.js`)

#### Added Input Validation:
```javascript
// ✅ Validate inputs before API calls
login: (email, password) => {
  if (!email || !password) {
    return Promise.reject(new Error('Email and password are required'));
  }
  return api.post('/auth/login', { email, password });
}
```

**Benefits:**
- Fails fast with clear error messages
- Prevents unnecessary API calls
- Better developer experience
- Consistent error handling

## Backend API Contract

The frontend now correctly implements the backend API contract:

### Login Endpoint: `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "EMPLOYEE" // or "MANAGER" or "ADMIN"
  }
}
```

### Refresh Endpoint: `POST /api/auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc..."
}
```

### Profile Endpoint: `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "role": "EMPLOYEE",
  "ratePerOrder": 15.0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Authentication Flow

### 1. Login Flow
```
User enters credentials
  ↓
Frontend validates inputs
  ↓
POST /api/auth/login
  ↓
Backend validates credentials
  ↓
Backend returns tokens + user data
  ↓
Frontend stores tokens in sessionStorage
  ↓
Frontend sets user state
  ↓
Frontend redirects based on role
```

### 2. Token Refresh Flow
```
API request with expired token
  ↓
Backend returns 401 Unauthorized
  ↓
Interceptor catches 401
  ↓
Check if refresh already attempted (_retry flag)
  ↓
Get refresh_token from sessionStorage
  ↓
POST /api/auth/refresh (direct axios call)
  ↓
Backend validates refresh token
  ↓
Backend returns new access_token
  ↓
Frontend updates access_token in sessionStorage
  ↓
Frontend retries original request with new token
```

### 3. Token Refresh Failure Flow
```
Refresh token expired/invalid
  ↓
Backend returns 401
  ↓
Frontend catches refresh failure
  ↓
Frontend clears all tokens
  ↓
Frontend redirects to /login
```

### 4. Logout Flow
```
User clicks logout
  ↓
Frontend clears user state
  ↓
Frontend clears tokens from sessionStorage
  ↓
Frontend redirects to /login
```

## Security Considerations

### 1. Token Storage
- **Current:** sessionStorage
- **Reasoning:** Tokens cleared when tab closes, more secure than localStorage
- **Alternative:** Consider httpOnly cookies for production (requires backend changes)

### 2. Token Expiry
- **Access Token:** 15 minutes (configurable)
- **Refresh Token:** 7 days (configurable)
- **Reasoning:** Short-lived access tokens minimize attack window, refresh tokens provide convenience

### 3. CORS Configuration
- **Frontend:** http://localhost:3000 (development)
- **Backend:** http://localhost:8080 (development)
- **Production:** Set proper CORS origins in backend .env

### 4. Password Reset Flow
- Uses OTP (One-Time Password) sent via email
- OTP expires in 10 minutes
- OTP is hashed before storage
- Refresh tokens invalidated after password reset

## Environment Configuration

See `ENV_CONFIG.md` for detailed environment setup instructions.

## Testing Checklist

### Manual Testing:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token automatically refreshes on expiry
- [ ] Multiple API calls don't cause multiple refresh attempts
- [ ] Logout clears all state and tokens
- [ ] Refresh token expiry redirects to login
- [ ] Role-based redirects work (ADMIN, MANAGER, EMPLOYEE)
- [ ] Page refresh maintains authentication state
- [ ] Browser back button works correctly
- [ ] Private/incognito mode works

### Edge Cases:
- [ ] sessionStorage full/disabled
- [ ] Network errors during login
- [ ] Network errors during token refresh
- [ ] Concurrent API calls during token refresh
- [ ] Backend API down/unreachable
- [ ] Malformed API responses
- [ ] Missing required fields in responses

## Known Limitations

1. **No Backend Logout Endpoint:**
   - Frontend only clears tokens locally
   - Tokens remain valid on backend until expiry
   - Consider adding backend logout endpoint to invalidate tokens

2. **sessionStorage Limitations:**
   - Tokens lost when tab closes
   - Not shared across tabs
   - Consider localStorage or httpOnly cookies for persistent auth

3. **No Token Blacklisting:**
   - Compromised tokens remain valid until expiry
   - Consider implementing token blacklist on backend

## Future Improvements

1. **Add Backend Logout Endpoint:**
   ```typescript
   POST /api/auth/logout
   // Invalidates refresh token in database
   ```

2. **Implement Token Blacklist:**
   - Store revoked tokens in Redis
   - Check on each request

3. **Add Remember Me Feature:**
   - Longer-lived refresh tokens (30 days)
   - Store in localStorage with encryption

4. **Implement Refresh Token Rotation:**
   - Issue new refresh token on each refresh
   - Invalidate old refresh token

5. **Add Activity Monitoring:**
   - Track last activity timestamp
   - Auto-logout after inactivity period

6. **Implement 2FA (Two-Factor Authentication):**
   - TOTP (Time-based One-Time Password)
   - SMS or email verification

## Migration Notes

### Breaking Changes:
None. All changes are backward compatible with existing backend API.

### Required Actions:
1. Create `.env.local` in project root (see ENV_CONFIG.md)
2. Create `.env` in src/api (see ENV_CONFIG.md)
3. Test authentication flow thoroughly
4. Update any custom auth logic in other components

## Troubleshooting

### Issue: "401 Unauthorized" loop
**Solution:** Check if backend API is running and JWT_SECRET matches

### Issue: "Token refresh failed"
**Solution:** Check if refresh_token is stored in sessionStorage and valid

### Issue: Redirect loop on login
**Solution:** Clear sessionStorage and try again

### Issue: CORS errors
**Solution:** Verify FRONTEND_URL in backend .env matches frontend URL

### Issue: "Invalid credentials"
**Solution:** Verify test credentials exist in database (run seed script)

## Support

For questions or issues:
1. Check backend API docs at http://localhost:8080/docs
2. Review backend logs for detailed error messages
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

