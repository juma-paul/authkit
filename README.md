# Auth Service

![Tests](https://img.shields.io/badge/tests-103%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-89%25-yellowgreen)
![Version](https://img.shields.io/badge/version-v0.1.0-blue)
![Node](https://img.shields.io/badge/node-v24%2B-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## About

**Auth Service** is a standalone, multi-tenant authentication service built to be reused across multiple applications.

Instead of rewriting authentication logic for every side project, register your app as a tenant, receive an API key, and plug in production-ready auth instantly — supporting email/password, OAuth (Google & GitHub), and Two-Factor Authentication out of the box.

> Built once. Used everywhere.

## Features

### 🔐 Authentication
- Email & password registration and login
- Secure logout with token revocation
- OAuth 2.0 — Google & GitHub

### ✉️ Email
- Email verification on registration
- Resend verification email
- Forgot password & reset flow

### 🔒 Security
- Two-Factor Authentication (TOTP)
- Backup codes for 2FA recovery
- httpOnly cookies (XSS protection)
- Rate limiting (brute force protection)
- bcrypt password hashing

### 👤 Account Management
- Update profile (name, avatar)
- Change email (with re-verification)
- Change password
- Soft account deletion (30-day restore window)
- Account restoration via email token

### 🏢 Multi-Tenancy
- Register multiple apps as tenants
- Per-tenant API key authentication
- Isolated users per tenant

## Quick Start

### Prerequisites
- Node.js v24+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/auth-service.git
cd auth-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development

# Start infrastructure
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Verify it's running

```bash
curl http://localhost:3002/health
```

## Environment Variables

Copy `.env.example` to `.env.development` and fill in the values:

```bash
# Server
PORT=3002
NODE_ENV=development
APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME

# JWT
JWT_SECRET=your_random_secret_here_min_32_chars
JWT_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/v1/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/api/v1/auth/github/callback

# Admin
ADMIN_SECRET=your_super_secret_key_here
```

## API Reference

Full API documentation available in [API_DOCS.md](./API_DOCS.md).

### Base URL
```
http://localhost:3002/api/v1
```

### Authentication
All protected endpoints require an `accessToken` cookie (set automatically on login).

All endpoints require:
```
X-API-Key: your_tenant_api_key
```

## Contributing

### Running Tests
```bash
npm test
```

### Running Tests with Coverage
```bash
npm run test:coverage
```

### Code Style
- TypeScript strict mode
- ESLint + Prettier

### License
[MIT](./LICENSE)




