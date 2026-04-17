# API Documentation

## Overview

**Base URL**

```
http://localhost:3002/api/v1
```

**All endpoints require:**

```
X-API-Key: your_tenant_api_key
```

**Response format:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {}
}
```

**Error format:**

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of error"
  }
}
```

---

## Error Codes

| Code               | Status | Description                                    |
| ------------------ | ------ | ---------------------------------------------- |
| `VALIDATION_ERROR` | 400    | Invalid input                                  |
| `INVALID_PASSWORD` | 400    | Incorrect password (for password verification) |
| `TOKEN_EXPIRED`    | 401    | JWT access token has expired                   |
| `UNAUTHORIZED`     | 401    | Invalid or missing token                       |
| `ACCOUNT_DELETED`  | 403    | Account has been soft-deleted                  |
| `FORBIDDEN`        | 403    | Email not verified or access denied            |
| `NOT_FOUND`        | 404    | Resource not found                             |
| `CONFLICT`         | 409    | Resource already exists                        |
| `RATE_LIMITED`     | 429    | Too many requests                              |
| `INTERNAL_ERROR`   | 500    | Server error                                   |

> **Frontend Integration Note**: The `TOKEN_EXPIRED` code triggers automatic token refresh via axios interceptor. `ACCOUNT_DELETED` and `UNAUTHORIZED` redirect to login.

---

## Health Check

### Get Service Health

```
GET /health
```

> Does **not** require `X-API-Key` header.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "environment": "production"
  }
}
```

---

## Tenant

### Register Tenant

```
POST /tenants
```

**Headers:**

```
X-Admin-Secret: your_admin_secret
```

**Request:**

```json
{
  "name": "MyApp",
  "ownerEmail": "me@myapp.com"
}
```

**Response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "MyApp",
      "api_key": "sk_abc123...",
      "owner_email": "me@myapp.com"
    }
  }
}
```

---

## Auth

### Register

```
POST /auth/register
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "termsAccepted": true
}
```

**Response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

> A verification email is sent. User must verify email before logging in.

---

### Login

```
POST /auth/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

> Sets `accessToken` and `refreshToken` as httpOnly cookies.
> If 2FA enabled, returns `{ "requires2FA": true, "userId": "uuid" }` instead.

---

### Logout

```
POST /auth/logout
```

> Requires `accessToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Logged out successfully"
  }
}
```

> Clears `accessToken` and `refreshToken` cookies.

---

### Refresh Tokens

```
POST /auth/refresh
```

> Requires `refreshToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Tokens refreshed successfully"
  }
}
```

> Sets new `accessToken` and `refreshToken` cookies.

---

### Forgot Password

```
POST /auth/forgot-password
```

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

### Reset Password

```
POST /auth/reset-password
```

**Request:**

```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123",
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

### Send Verification Email

```
POST /auth/send-verification
```

> Requires `accessToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Verification email sent"
  }
}
```

---

### Verify Email

```
POST /auth/verify-email
```

**Request:**

```json
{
  "token": "verification_token_from_email"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Email verified successfully"
  }
}
```

---

### Resend Verification Email

```
POST /auth/resend-verification
```

> Requires `accessToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Verification email sent"
  }
}
```

---

## OAuth

### Get OAuth URL

```
GET /auth/oauth/url?provider=google
GET /auth/oauth/url?provider=github
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/..."
  }
}
```

---

### Google Callback

```
GET /auth/google/callback
```

> Handled automatically by OAuth flow. Returns tokens as cookies.

---

### GitHub Callback

```
GET /auth/github/callback
```

> Handled automatically by OAuth flow. Returns tokens as cookies.

---

## Two-Factor Authentication (2FA)

### Setup 2FA

```
POST /users/2fa/setup
```

> Requires `accessToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "BASE32SECRET"
  }
}
```

---

### Verify & Enable 2FA

```
POST /users/2fa/verify
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "code": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "2FA enabled successfully",
    "backupCodes": ["code1", "code2", "..."]
  }
}
```

---

### Disable 2FA

```
POST /users/2fa/disable
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "code": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "2FA disabled successfully"
  }
}
```

---

### Validate 2FA (Login)

```
POST /auth/2fa/validate
```

**Request:**

```json
{
  "userId": "uuid",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "2FA validated successfully"
  }
}
```

> Sets `accessToken` and `refreshToken` as httpOnly cookies.

---

## Users

### Get Profile

```
GET /users/profile
```

> Requires `accessToken` cookie.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://...",
      "email_verified": true,
      "two_factor_enabled": false
    }
  }
}
```

---

### Update Profile

```
PUT /users/profile
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "avatar_url": "https://example.com/avatar.png"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

---

### Sign Cloudinary Upload

```
POST /users/cloudinary-sign
```

> Requires `accessToken` cookie.

Generates a signature for direct browser-to-Cloudinary uploads. Used for secure avatar uploads without exposing API secret.

**Request:**

```json
{
  "paramsToSign": {
    "timestamp": 1234567890,
    "folder": "avatars",
    "upload_preset": "your_preset"
  }
}
```

**Response (200):**

```json
{
  "signature": "a1b2c3d4e5f6..."
}
```

**Frontend Usage:**

```typescript
// 1. Get signature from backend
const { signature } = await api.post('/users/cloudinary-sign', { paramsToSign });

// 2. Upload directly to Cloudinary
const formData = new FormData();
formData.append('file', file);
formData.append('signature', signature);
formData.append('api_key', CLOUDINARY_API_KEY);
// ... other params
await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: 'POST',
  body: formData
});
```

---

### Change Email

```
PUT /users/change-email
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "newEmail": "newemail@example.com",
  "password": "Password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Please verify your new email address"
  }
}
```

---

### Verify Email Change

```
GET /users/verify-email-change?token=<token>
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Email changed successfully. Please log in again."
  }
}
```

---

### Change Password

```
PUT /users/change-password
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123",
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

### Delete Account

```
DELETE /users/account
```

> Requires `accessToken` cookie.

**Request:**

```json
{
  "password": "Password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Account deleted. You have 30 days to restore it."
  }
}
```

---

### Restore Account

```
POST /users/account/restore
```

**Request:**

```json
{
  "token": "restore_token_from_email"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Account restored successfully"
  }
}
```
