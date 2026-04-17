/**
 * Test Data Factory - Test data generation
 *
 * Provides factory functions and builders for creating test data
 * with sensible defaults and easy customization.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../../config/database";
import { config } from "../../config/env";

// ============================================================================
// Constants
// ============================================================================

export const TEST_API_KEY = "sk_test_1234567890abcdef";
export const TEST_PASSWORD = "Password123";
export const TEST_PASSWORD_HASH_ROUNDS = 12;

export const TEST_EMAILS = {
  default: "test@example.com",
  unverified: "unverified@example.com",
  deleted: "deleted@example.com",
  oauth: "oauth@example.com",
  twoFactor: "2fa@example.com",
} as const;

export const TEST_TENANT = {
  name: "TestApp",
  ownerEmail: "admin@testapp.com",
} as const;

// ============================================================================
// Types
// ============================================================================

interface UserOptions {
  email?: string;
  emailVerified?: boolean;
  termsAccepted?: boolean;
  authProvider?: "local" | "google" | "github";
  deletedAt?: Date | null;
  firstName?: string;
  lastName?: string;
}

interface TokenOptions {
  expiresIn?: string;
  jti?: string;
  authProvider?: "local" | "google" | "github";
}

interface TwoFactorOptions {
  enabled?: boolean;
  secret?: string;
}

// ============================================================================
// Factory: Tenant
// ============================================================================

export async function createTestTenant(): Promise<string> {
  await pool.query(
    `INSERT INTO tenants (name, api_key, owner_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (api_key) DO NOTHING`,
    [TEST_TENANT.name, TEST_API_KEY, TEST_TENANT.ownerEmail]
  );

  const result = await pool.query(
    "SELECT id FROM tenants WHERE api_key = $1",
    [TEST_API_KEY]
  );

  return result.rows[0].id;
}

export async function getTestTenantId(): Promise<string> {
  const result = await pool.query(
    `INSERT INTO tenants (name, api_key, owner_email)
     VALUES ('BudgetApp', $1, 'admin@budgetapp.com')
     ON CONFLICT (api_key) DO UPDATE SET name = 'BudgetApp'
     RETURNING id`,
    [TEST_API_KEY]
  );
  return result.rows[0].id;
}

// ============================================================================
// Factory: User
// ============================================================================

export async function createTestUser(
  tenantId: string,
  options: UserOptions = {}
): Promise<{ id: string; email: string }> {
  const {
    email = TEST_EMAILS.default,
    emailVerified = true,
  } = options;

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, TEST_PASSWORD_HASH_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, email_verified, terms_accepted, terms_accepted_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (email, tenant_id) DO UPDATE SET email_verified = $4
     RETURNING id, email`,
    [tenantId, email, passwordHash, emailVerified]
  );

  return result.rows[0];
}

export async function createVerifiedUser(tenantId: string, email?: string) {
  return createTestUser(tenantId, {
    email: email || TEST_EMAILS.default,
    emailVerified: true,
  });
}

export async function createUnverifiedUser(tenantId: string, email?: string) {
  return createTestUser(tenantId, {
    email: email || TEST_EMAILS.unverified,
    emailVerified: false,
  });
}

export async function createDeletedUser(tenantId: string, email?: string) {
  const user = await createTestUser(tenantId, {
    email: email || TEST_EMAILS.deleted,
    emailVerified: true,
  });

  // Mark as deleted
  await pool.query(
    "UPDATE users SET deleted_at = NOW() WHERE id = $1",
    [user.id]
  );

  return user;
}

export async function createOAuthUser(
  tenantId: string,
  provider: "google" | "github",
  email?: string
) {
  const user = await createTestUser(tenantId, {
    email: email || TEST_EMAILS.oauth,
    emailVerified: true,
  });

  // Update auth_provider if column exists, otherwise just return
  try {
    await pool.query(
      "UPDATE users SET auth_provider = $1 WHERE id = $2",
      [provider, user.id]
    );
  } catch {
    // Column may not exist in test DB - that's OK
  }

  return user;
}

// ============================================================================
// Factory: Tokens
// ============================================================================

export function generateAccessToken(
  userId: string,
  email: string,
  options: TokenOptions = {}
): string {
  const { expiresIn = "1h", authProvider = "local" } = options;
  return jwt.sign(
    { userId, email, authProvider },
    config.jwtSecret,
    { expiresIn } as jwt.SignOptions
  );
}

export function generateRefreshToken(
  userId: string,
  email: string,
  options: TokenOptions = {}
): string {
  const { expiresIn = "7d", jti = crypto.randomUUID(), authProvider = "local" } = options;
  return jwt.sign(
    { userId, email, authProvider, jti },
    config.jwtRefreshSecret,
    { expiresIn } as jwt.SignOptions
  );
}

export function generateExpiredToken(
  userId: string,
  email: string,
  authProvider: "local" | "google" | "github" = "local"
): string {
  return jwt.sign(
    { userId, email, authProvider },
    config.jwtSecret,
    { expiresIn: "-1s" } as jwt.SignOptions
  );
}

export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [userId, token]
  );
}

// ============================================================================
// Factory: Email Verification Tokens
// ============================================================================

export async function createEmailVerificationToken(
  userId: string,
  options: { expired?: boolean; used?: boolean } = {}
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = options.expired
    ? new Date(Date.now() - 1000) // Expired
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at, used_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, options.used ? new Date() : null]
  );

  return token;
}

// ============================================================================
// Factory: Password Reset Tokens
// ============================================================================

export async function createPasswordResetToken(
  userId: string,
  options: { expired?: boolean; used?: boolean } = {}
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = options.expired
    ? new Date(Date.now() - 1000)
    : new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, used_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, options.used ? new Date() : null]
  );

  return token;
}

// ============================================================================
// Factory: Two-Factor Authentication
// ============================================================================

export async function setup2FA(
  userId: string,
  options: TwoFactorOptions = {}
): Promise<{ secret: string; backupCodes: string[] }> {
  const { enabled = false, secret = crypto.randomBytes(20).toString("hex") } =
    options;

  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  await pool.query(
    `INSERT INTO two_factor_auth (user_id, secret, enabled, backup_codes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       secret = $2,
       enabled = $3,
       backup_codes = $4`,
    [userId, secret, enabled, JSON.stringify(backupCodes)]
  );

  return { secret, backupCodes };
}

// ============================================================================
// Factory: Account Restore Tokens
// ============================================================================

export async function createRestoreToken(
  userId: string,
  options: { expired?: boolean } = {}
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = options.expired
    ? new Date(Date.now() - 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await pool.query(
    `UPDATE users SET
       restore_token = $1,
       restore_token_expires_at = $2,
       deleted_at = NOW()
     WHERE id = $3`,
    [token, expiresAt, userId]
  );

  return token;
}

// ============================================================================
// Cleanup
// ============================================================================

export async function cleanupTestData(): Promise<void> {
  // Clean in order respecting foreign key constraints
  // Use simple approach matching original testHelpers
  await pool.query("DELETE FROM refresh_tokens WHERE token IS NOT NULL");
  await pool.query("DELETE FROM users WHERE email LIKE $1", ["%example.com%"]);
  await pool.query("DELETE FROM tenants WHERE name = 'TestApp'");
}


// ============================================================================
// Request Builder
// ============================================================================

export class RequestBuilder {
  private _headers: Record<string, string> = {};
  private _cookies: string[] = [];
  private _body: Record<string, unknown> = {};

  withApiKey(apiKey: string = TEST_API_KEY): this {
    this._headers["X-API-Key"] = apiKey;
    return this;
  }

  withAccessToken(token: string): this {
    this._cookies.push(`accessToken=${token}`);
    return this;
  }

  withRefreshToken(token: string): this {
    this._cookies.push(`refreshToken=${token}`);
    return this;
  }

  withBody(body: Record<string, unknown>): this {
    this._body = body;
    return this;
  }

  get headers(): Record<string, string> {
    const result = { ...this._headers };
    if (this._cookies.length > 0) {
      result["Cookie"] = this._cookies.join("; ");
    }
    return result;
  }

  get body(): Record<string, unknown> {
    return this._body;
  }
}

export function request(): RequestBuilder {
  return new RequestBuilder();
}

// ============================================================================
// Assertions Helpers
// ============================================================================

export function expectSuccessResponse(res: { body: { success: boolean } }) {
  expect(res.body.success).toBe(true);
}

export function expectErrorCode(
  res: { body: { error?: { code?: string } } },
  code: string
) {
  expect(res.body.error?.code).toBe(code);
}

export function expectNoCookies(res: { headers: Record<string, string> }) {
  expect(res.headers["set-cookie"]).toBeUndefined();
}

export function expectCookiesSet(res: { headers: Record<string, string> }) {
  expect(res.headers["set-cookie"]).toBeDefined();
}

export function expectNoPasswordHash(res: {
  body: { data?: { user?: { password_hash?: string } } };
}) {
  expect(res.body.data?.user?.password_hash).toBeUndefined();
}
