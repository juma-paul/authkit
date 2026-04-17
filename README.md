# AuthKit — Self-Hosted Identity Infrastructure

> Deploy once, authenticate every project. Multi-tenant identity API with OAuth, 2FA, and complete account management.

![CI](https://github.com/juma-paul/authkit/actions/workflows/ci.yml/badge.svg?branch=main)
![Tests](https://github.com/juma-paul/authkit/actions/workflows/ci.yml/badge.svg?branch=main)
![Version](https://img.shields.io/badge/version-v1.0.0-blue)
![Node](https://img.shields.io/badge/node-v24%2B-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)
![License](https://img.shields.io/github/license/juma-paul/authkit)

[Live Demo](https://authkit-demo-six.vercel.app) | [API Docs](./API_DOCS.md) | [Features](#features) | [Quick Start](#quick-start)

---

## About

**AuthKit** is a self-hosted, multi-tenant identity API designed to eliminate repetitive auth work across projects. Deploy it once, then connect any application as a tenant — each gets its own isolated user base, API key, and full-featured authentication system.

**The idea:** Instead of rewriting authentication for every side project, I built AuthKit to be my personal Auth0,clerk/Firebase Auth — a single backend that powers all my apps.

## Tags

`authentication` `oauth` `2fa` `multi-tenant` `typescript` `express` `postgresql` `docker` `gcp` `cloud-run` `github-actions` `ci-cd` `jwt` `security`

## Technologies

| Category             | Stack                            |
| -------------------- | -------------------------------- |
| **Runtime**          | Node.js 24                       |
| **Framework**        | Express 5.x                      |
| **Language**         | TypeScript (strict mode)         |
| **Database**         | PostgreSQL 17                    |
| **Testing**          | Jest + Supertest                 |
| **Security**         | Passport.js, JWT, bcrypt, Helmet |
| **Email**            | Resend                           |
| **Image Upload**     | Cloudinary                       |
| **Containerization** | Docker                           |
| **CI/CD**            | GitHub Actions                   |
| **Deployment**       | Google Cloud Run                 |

## Features

### Authentication

- Email/password registration and login
- Secure logout with token revocation
- OAuth 2.0 (Google & GitHub)
- JWT access tokens (15min) + refresh token rotation (7d)
- httpOnly cookies for XSS protection

### Email Flows

- Email verification on registration
- Resend verification email
- Forgot password & reset flow
- Email change with re-verification

### Security

- Two-Factor Authentication (TOTP) with backup codes
- Rate limiting (100/min global, 10/min auth)
- bcrypt password hashing (12 rounds)
- SQL injection prevention (parameterized queries)
- CSRF-protected OAuth flows (state tokens)

### User Management

- Profile updates (name, avatar via Cloudinary)
- Change password (local accounts only)
- Soft account deletion (30-day restore window)
- Account restoration via email token

### Multi-Tenancy

- Each application registers as a tenant
- Per-tenant API key authentication
- Fully isolated user bases per tenant

## Quick Start

### Prerequisites

- Node.js v24+
- Docker & Docker Compose
- PostgreSQL (via Docker or external)

### Installation

```bash
# Clone the repo
git clone https://github.com/juma-paul/authkit.git
cd authkit

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.development
# Edit .env.development with your values

# Start infrastructure (PostgreSQL)
docker-compose up -d

# Run database migrations
# inside infrastructure/database
psql "DATABASE_URL" -f schema.sql

# Start development server
npm run dev
```

### Verify it's running

```bash
curl http://localhost:3002/health
# Response: {"status":"ok","environment":"development"}
```

## Running the Project

```bash
npm run dev        # Start with hot reload
npm test           # Run tests
npm run test:watch # Watch mode
npm run build      # Build for production
npm start          # Run production build
```

### Docker

```bash
docker build -t authkit .
docker run -p 3002:3002 --env-file .env authkit
```

## Environment Variables

Copy `.env.example` to `.env.development` and configure:

| Category     | Variables                                           |
| ------------ | --------------------------------------------------- |
| **Server**   | `PORT`, `NODE_ENV`, `APP_URL`, `API_URL`            |
| **Database** | `DATABASE_URL`                                      |
| **Auth**     | `JWT_SECRET`, `JWT_REFRESH_SECRET`, expiry settings |
| **OAuth**    | Google & GitHub client IDs, secrets, callbacks      |
| **Services** | Resend API key, Cloudinary credentials              |
| **Admin**    | `ADMIN_SECRET`                                      |

See [`.env.example`](./.env.example) for complete list with descriptions.

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

## Demo

**Live Demo:** [authkit-demo-six.vercel.app](https://authkit-demo-six.vercel.app)

**Video Walkthrough:**

[![AuthKit Demo](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)

> _Click to watch the full demo on YouTube_

**Reference Client:** [AuthKit Demo](https://github.com/juma-paul/authkit-demo) — Production-ready Next.js frontend

## Development

### How I Built It

1. **Architecture Design** — Clean separation: controllers for business logic, middleware for cross-cutting concerns, services for external integrations
2. **Security First** — Implemented httpOnly cookies, JWT rotation, bcrypt hashing, and rate limiting from day one
3. **Multi-Tenancy** — Designed database schema with tenant isolation using API keys and composite unique constraints
4. **OAuth Integration** — Added Google and GitHub using Passport.js with CSRF-protected state tokens
5. **Testing** — Built comprehensive test suite with Jest + Supertest, mocking external services

### What I Learned

- **Token Refresh Race Conditions** — Frontend interceptors need request queuing during refresh to avoid multiple refresh calls
- **401 vs 400 Semantics** — Using specific error codes (`TOKEN_EXPIRED` vs `UNAUTHORIZED`) enables smarter client-side handling
- **Soft Delete UX** — 30-day restore windows require clear user communication and email-based recovery flows
- **OAuth State Tokens** — Essential for preventing CSRF attacks in OAuth flows

### Future Improvements

- [ ] Add Redis for token blacklisting and session management
- [ ] Implement account lockout after N failed login attempts
- [ ] Add WebAuthn/passkey support
- [ ] Structured logging with Winston/Pino
- [ ] Request tracing with correlation IDs
- [ ] Prometheus metrics endpoint
- [ ] GraphQL API alongside REST

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

## Related Projects

- **[AuthKit Demo](https://github.com/juma-paul/authkit-demo)** — Reference frontend client built with Next.js, demonstrating full integration with AuthKit.

## License

This project is open source and available under the [MIT License](./LICENSE).

---

<div align="center">

**Built with TypeScript, Express, and PostgreSQL.**

If you found this helpful, consider giving it a star
<img src="https://github.githubassets.com/images/icons/emoji/unicode/2b50.png" 
     height="18" 
     style="vertical-align: text-bottom;" />

</div>
