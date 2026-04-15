# Auth Service

> Multi-tenant authentication microservice with OAuth, 2FA, and comprehensive account management

![Tests](https://img.shields.io/badge/tests-98%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-89%25-yellowgreen)
![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Node](https://img.shields.io/badge/node-v24%2B-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## About

**Auth Service** is a standalone, multi-tenant authentication microservice built to be reused across multiple applications. Instead of rewriting authentication logic for every project, register your app as a tenant, receive an API key, and integrate production-ready auth instantly.

> Built once. Used everywhere.

## Tags

`authentication` `oauth` `2fa` `multi-tenant` `typescript` `express` `postgresql` `docker` `gcp` `cloud-run` `github-actions` `ci-cd` `jwt` `security`

## Technologies

| Category | Stack |
|----------|-------|
| **Runtime** | Node.js 24 |
| **Framework** | Express 5.x |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL 17 |
| **Testing** | Jest + Supertest |
| **Security** | Passport.js, JWT, bcrypt, Helmet |
| **Email** | Resend |
| **Image Upload** | Cloudinary |
| **Containerization** | Docker |
| **CI/CD** | GitHub Actions |
| **Deployment** | Google Cloud Run |

## Features

### Authentication
- Email/password registration and login
- Secure logout with token revocation
- OAuth 2.0 (Google & GitHub)
- JWT access tokens (15min) + refresh token rotation (7d)
- httpOnly cookies for XSS protection

### Email
- Email verification on registration
- Resend verification email
- Forgot password & reset flow
- Email change with re-verification

### Security
- Two-Factor Authentication (TOTP)
- 10 backup codes for 2FA recovery
- Rate limiting (100/min global, 10/min auth)
- bcrypt password hashing (12 rounds)
- SQL injection prevention (parameterized queries)
- CSRF-protected OAuth flows (state tokens)

### Account Management
- Update profile (name, avatar via Cloudinary)
- Change password (local accounts only)
- Soft account deletion (30-day restore window)
- Account restoration via email token

### Multi-Tenancy
- Register multiple apps as tenants
- Per-tenant API key authentication
- Isolated users per tenant

## Quick Start

### Prerequisites
- Node.js v24+
- Docker & Docker Compose
- PostgreSQL (via Docker or external)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/auth-service.git
cd auth-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development
# Edit .env.development with your values

# Start infrastructure (PostgreSQL)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Verify it's running

```bash
curl http://localhost:3001/health
# Response: {"status":"ok","environment":"development"}
```

## Running the Project

### Local Development

```bash
npm run dev        # Start with hot reload
npm test           # Run tests
npm run test:watch # Watch mode
npm run build      # Build for production
npm start          # Run production build
```

### Docker

```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 3001:3001 --env-file .env auth-service
```

### Production Deployment (GCP Cloud Run)

1. **Build and push to Artifact Registry:**
```bash
# Configure Docker for GCP
gcloud auth configure-docker REGION-docker.pkg.dev

# Build and tag
docker build -t REGION-docker.pkg.dev/PROJECT_ID/REPO/auth-service:latest .

# Push
docker push REGION-docker.pkg.dev/PROJECT_ID/REPO/auth-service:latest
```

2. **Deploy to Cloud Run:**
```bash
gcloud run deploy auth-service \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPO/auth-service:latest \
  --platform managed \
  --region REGION \
  --allow-unauthenticated
```

3. **Set environment variables** via Cloud Run console or CLI

4. **Point custom domain** (optional) via Cloud Run domain mappings

## Environment Variables

Copy `.env.example` to `.env.development`:

```bash
# Server
PORT=3001
NODE_ENV=development
APP_URL=https://your-frontend.com
API_URL=https://your-api.com

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# JWT
JWT_SECRET=your_random_secret_here_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/github/callback

# Cloudinary (Image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin
ADMIN_SECRET=your_super_secret_key_here
```

## API Documentation

Full API documentation: [API_DOCS.md](./API_DOCS.md)

### Base URL
```
https://your-api.com/api/v1
```

### Authentication
- All endpoints require `X-API-Key` header with your tenant API key
- Protected endpoints use `accessToken` cookie (set automatically on login)

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

Current coverage: **89%** | Tests: **98 passing**

## Development Process

### How I Built It

1. **Architecture Design**: Started with clean separation - controllers for business logic, middleware for cross-cutting concerns, services for external integrations
2. **Security First**: Implemented httpOnly cookies, JWT rotation, bcrypt hashing, and rate limiting from day one
3. **Multi-Tenancy**: Designed database schema with tenant isolation using API keys and composite unique constraints
4. **OAuth Integration**: Added Google and GitHub using Passport.js with CSRF-protected state tokens
5. **Testing**: Built comprehensive test suite with Jest + Supertest, mocking external services

### What I Learned

- **Token Refresh Race Conditions**: Frontend interceptors need request queuing during refresh to avoid multiple refresh calls
- **401 vs 400 Semantics**: Using specific error codes (`TOKEN_EXPIRED` vs `UNAUTHORIZED`) enables smarter client-side handling
- **Soft Delete UX**: 30-day restore windows require clear user communication and email-based recovery flows
- **OAuth State Tokens**: Essential for preventing CSRF attacks in OAuth flows

### Future Improvements

- [ ] Add Redis for token blacklisting and session management
- [ ] Implement account lockout after N failed login attempts
- [ ] Add WebAuthn/passkey support
- [ ] Structured logging with Winston/Pino
- [ ] Request tracing with correlation IDs
- [ ] Prometheus metrics endpoint
- [ ] GraphQL API alongside REST

## Demo

For backend services, demo via:
1. **Postman Collection**: Import and test all endpoints
2. **Screen Recording**: API testing walkthrough
3. **Live API**: `https://your-cloud-run-url.run.app/health`

<!-- TODO: Add screen recording link -->

## Project Structure

```
src/
├── config/        # Environment, database, passport
├── controllers/   # Request handlers
├── middleware/    # Auth, error handling, tenant
├── routes/        # API route definitions
├── services/      # Email service
├── utils/         # Tokens, cookies, response helpers
├── errors/        # Custom error classes
├── validators/    # Zod validation schemas
├── constants/     # Error messages, configs
└── tests/         # Jest test suites
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits

## License

[MIT](./LICENSE)

---

Built with TypeScript, Express, and PostgreSQL
