/**
 * Auth Service - Integration Tests
 *
 * Comprehensive API integration tests organized by user journey.
 * Tests full request/response cycles with database interactions.
 *
 * Flows covered:
 * A. Registration
 * B. Email Verification
 * C. Login
 * D. OAuth
 * E. Profile Management
 * F. Password Change
 * G. Two-Factor Authentication
 * H. Forgot Password
 * I. Delete Account
 * J. Deleted Account Login
 * K. Account Restoration
 * L. Session Expiry & Token Refresh
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import app from "../app";
import { pool } from "../config/database";
import { config } from "../config/env";
import {
  TEST_API_KEY,
  TEST_PASSWORD,
  TEST_EMAILS,
  getTestTenantId,
  createVerifiedUser,
  createUnverifiedUser,
  createOAuthUser,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  cleanupTestData,
} from "./factories/testDataFactory";

// ============================================================================
// Mock External Services
// ============================================================================

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
    },
  })),
}));

// Mock passport for OAuth tests (avoid real OAuth calls)
jest.mock("passport", () => ({
  initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  authenticate:
    (strategy: string, _options: unknown) =>
    (req: { path: string; user?: unknown }, res: { redirect: (url: string) => void }, next: () => void) => {
      if (req.path.includes("callback")) {
        req.user = { id: "mock-user-id", email: "test@example.com" };
        next();
      } else {
        res.redirect(`https://${strategy}.com/oauth`);
      }
    },
  use: jest.fn(),
}));

// ============================================================================
// Test Setup
// ============================================================================

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

beforeEach(async () => {
  await cleanupTestData();
});

// ============================================================================
// Helper Functions
// ============================================================================

const api = (method: "get" | "post" | "put" | "delete", path: string) => {
  return request(app)[method](`/api/v1${path}`).set("X-API-Key", TEST_API_KEY);
};

const apiAuth = (
  method: "get" | "post" | "put" | "delete",
  path: string,
  accessToken: string
) => {
  return api(method, path).set("Cookie", `accessToken=${accessToken}`);
};

const apiAuthWithRefresh = (
  method: "get" | "post" | "put" | "delete",
  path: string,
  accessToken: string,
  refreshToken: string
) => {
  return api(method, path).set(
    "Cookie",
    `accessToken=${accessToken}; refreshToken=${refreshToken}`
  );
};

// ============================================================================
// A. Registration Flow
// ============================================================================

describe("Integration Tests", () => {
  describe("A. Registration Flow", () => {
    const validRegistration = {
      email: TEST_EMAILS.default,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      termsAccepted: true,
    };

    it("should reject empty form with validation errors", async () => {
      const res = await api("post", "/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid email format", async () => {
      const res = await api("post", "/auth/register").send({
        ...validRegistration,
        email: "not-an-email",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject password < 8 chars", async () => {
      const res = await api("post", "/auth/register").send({
        ...validRegistration,
        password: "weak",
        confirmPassword: "weak",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject mismatched passwords", async () => {
      const res = await api("post", "/auth/register").send({
        ...validRegistration,
        confirmPassword: "DifferentPassword123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject when terms not accepted", async () => {
      const res = await api("post", "/auth/register").send({
        ...validRegistration,
        termsAccepted: false,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should register with valid data and send verification email", async () => {
      const res = await api("post", "/auth/register").send(validRegistration);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_EMAILS.default);
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("should reject duplicate email", async () => {
      await api("post", "/auth/register").send(validRegistration);

      const res = await api("post", "/auth/register").send(validRegistration);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });

  // ============================================================================
  // B. Email Verification
  // ============================================================================

  describe("B. Email Verification", () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      const user = await createUnverifiedUser(tenantId);
      userId = user.id;
      accessToken = generateAccessToken(userId, user.email);
    });

    it("should send verification email", async () => {
      const res = await apiAuth("post", "/auth/send-verification", accessToken);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Verification email sent");
    });

    it("should return success if already verified", async () => {
      await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
        userId,
      ]);

      const res = await apiAuth("post", "/auth/send-verification", accessToken);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Email already verified");
    });

    it("should verify email with valid token", async () => {
      const token = "valid-verification-token";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, token]
      );

      const res = await api("post", "/auth/verify-email").send({ token });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Email verified successfully");

      const user = await pool.query(
        "SELECT email_verified FROM users WHERE id = $1",
        [userId]
      );
      expect(user.rows[0].email_verified).toBe(true);
    });

    it("should reject expired token", async () => {
      const token = "expired-token";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
        [userId, token]
      );

      const res = await api("post", "/auth/verify-email").send({ token });

      expect(res.status).toBe(401);
    });

    it("should reject already-used token", async () => {
      const token = "used-token";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at, used_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours', NOW())`,
        [userId, token]
      );

      const res = await api("post", "/auth/verify-email").send({ token });

      expect(res.status).toBe(401);
    });

    it("should reject missing token", async () => {
      const res = await api("post", "/auth/verify-email").send({});

      expect(res.status).toBe(400);
    });

    it("should resend verification email (authenticated)", async () => {
      const res = await apiAuth(
        "post",
        "/auth/send-verification",
        accessToken
      );

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Verification email sent");
    });
  });

  // ============================================================================
  // C. Login Flow
  // ============================================================================

  describe("C. Login Flow", () => {
    beforeEach(async () => {
      await createVerifiedUser(tenantId);
    });

    it("should reject wrong password", async () => {
      const res = await api("post", "/auth/login").send({
        email: TEST_EMAILS.default,
        password: "WrongPassword123",
      });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await api("post", "/auth/login").send({
        email: "nonexistent@example.com",
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(401);
    });

    it("should reject unverified email", async () => {
      await createUnverifiedUser(tenantId, "unverified@example.com");

      const res = await api("post", "/auth/login").send({
        email: "unverified@example.com",
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should login successfully and set cookies", async () => {
      const res = await api("post", "/auth/login").send({
        email: TEST_EMAILS.default,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
    });
  });

  // ============================================================================
  // D. OAuth Login
  // ============================================================================

  describe("D. OAuth Login", () => {
    it("should generate valid Google OAuth URL", async () => {
      const res = await api("get", "/auth/oauth/url").query({
        provider: "google",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain("/auth/google");
      expect(res.body.data.url).toContain("state=");
    });

    it("should generate valid GitHub OAuth URL", async () => {
      const res = await api("get", "/auth/oauth/url").query({
        provider: "github",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain("/auth/github");
      expect(res.body.data.url).toContain("state=");
    });

    it("should reject invalid provider", async () => {
      const res = await api("get", "/auth/oauth/url").query({
        provider: "twitter",
      });

      expect(res.status).toBe(400);
    });

    it("should reject request without API key", async () => {
      const res = await request(app)
        .get("/api/v1/auth/oauth/url")
        .query({ provider: "google" });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // E. Profile Management
  // ============================================================================

  describe("E. Profile Management", () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
      accessToken = generateAccessToken(userId, user.email);
    });

    it("should get profile with valid token", async () => {
      const res = await apiAuth("get", "/users/profile", accessToken);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(TEST_EMAILS.default);
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it("should reject request without token", async () => {
      const res = await api("get", "/users/profile");

      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await apiAuth("get", "/users/profile", "invalid-token");

      expect(res.status).toBe(401);
    });

    it("should update profile fields", async () => {
      const res = await apiAuth("put", "/users/profile", accessToken).send({
        first_name: "John",
        last_name: "Doe",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.first_name).toBe("John");
      expect(res.body.data.user.last_name).toBe("Doe");
    });

    it("should update only first_name without affecting last_name", async () => {
      await apiAuth("put", "/users/profile", accessToken).send({
        first_name: "John",
        last_name: "Doe",
      });

      const res = await apiAuth("put", "/users/profile", accessToken).send({
        first_name: "Jane",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.user.first_name).toBe("Jane");
      expect(res.body.data.user.last_name).toBe("Doe");
    });

    it("should reject invalid avatar_url", async () => {
      const res = await apiAuth("put", "/users/profile", accessToken).send({
        avatar_url: "not-a-url",
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should not return sensitive fields", async () => {
      const res = await apiAuth("put", "/users/profile", accessToken).send({
        first_name: "Test",
      });

      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.restore_token).toBeUndefined();
    });
  });

  // ============================================================================
  // F. Password Change
  // ============================================================================

  describe("F. Password Change", () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
      accessToken = generateAccessToken(userId, user.email);
    });

    it("should reject wrong current password", async () => {
      const res = await apiAuth(
        "put",
        "/users/change-password",
        accessToken
      ).send({
        currentPassword: "WrongPassword",
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      expect(res.status).toBe(400); // INVALID_PASSWORD returns 400
    });

    it("should reject mismatched new passwords", async () => {
      const res = await apiAuth(
        "put",
        "/users/change-password",
        accessToken
      ).send({
        currentPassword: TEST_PASSWORD,
        newPassword: "NewPassword123",
        confirmPassword: "DifferentPassword123",
      });

      expect(res.status).toBe(400);
    });

    it("should change password and revoke tokens", async () => {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [userId, "test-refresh-token"]
      );

      const res = await apiAuth(
        "put",
        "/users/change-password",
        accessToken
      ).send({
        currentPassword: TEST_PASSWORD,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Password changed successfully");

      const tokens = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
        [userId]
      );
      expect(tokens.rows[0].revoked_at).not.toBeNull();
    });

    it("should block password change for OAuth users", async () => {
      const oauthUser = await createOAuthUser(tenantId, "google");
      const oauthToken = generateAccessToken(oauthUser.id, oauthUser.email);

      const res = await apiAuth(
        "put",
        "/users/change-password",
        oauthToken
      ).send({
        currentPassword: TEST_PASSWORD,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      expect(res.status).toBe(403);
    });

    it("should reject request without token", async () => {
      const res = await api("put", "/users/change-password").send({
        currentPassword: TEST_PASSWORD,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // G. Two-Factor Authentication
  // ============================================================================

  describe("G. Two-Factor Authentication", () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
      accessToken = generateAccessToken(userId, user.email);
    });

    it("should setup 2FA and return QR code", async () => {
      const res = await apiAuth("post", "/users/2fa/setup", accessToken);

      expect(res.status).toBe(200);
      expect(res.body.data.qrCode).toBeDefined();
      expect(res.body.data.secret).toBeDefined();
    });

    it("should reject setup without token", async () => {
      const res = await api("post", "/users/2fa/setup");

      expect(res.status).toBe(401);
    });

    describe("with 2FA setup", () => {
      let secret: string;

      beforeEach(async () => {
        secret = speakeasy.generateSecret().base32;
        await pool.query(
          `INSERT INTO two_factor_auth (user_id, secret, enabled)
           VALUES ($1, $2, false)`,
          [userId, secret]
        );
      });

      it("should enable 2FA with valid code", async () => {
        const code = speakeasy.totp({ secret, encoding: "base32" });

        const res = await apiAuth("post", "/users/2fa/verify", accessToken).send(
          { code }
        );

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe("2FA enabled successfully");
      });

      it("should return backup codes on enable", async () => {
        const code = speakeasy.totp({ secret, encoding: "base32" });

        const res = await apiAuth("post", "/users/2fa/verify", accessToken).send(
          { code }
        );

        expect(res.body.data.backupCodes).toBeDefined();
        expect(res.body.data.backupCodes).toHaveLength(10);
      });

      it("should reject invalid 2FA code", async () => {
        const res = await apiAuth("post", "/users/2fa/verify", accessToken).send(
          { code: "000000" }
        );

        expect(res.status).toBe(400); // INVALID_PASSWORD returns 400
      });
    });

    describe("with 2FA enabled", () => {
      let secret: string;

      beforeEach(async () => {
        secret = speakeasy.generateSecret().base32;
        await pool.query(
          `INSERT INTO two_factor_auth (user_id, secret, enabled)
           VALUES ($1, $2, true)`,
          [userId, secret]
        );
      });

      it("should disable 2FA with valid code", async () => {
        const code = speakeasy.totp({ secret, encoding: "base32" });

        const res = await apiAuth(
          "post",
          "/users/2fa/disable",
          accessToken
        ).send({ code });

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe("2FA disabled successfully");
      });

      it("should reject invalid code when disabling", async () => {
        const res = await apiAuth(
          "post",
          "/users/2fa/disable",
          accessToken
        ).send({ code: "000000" });

        expect(res.status).toBe(400); // INVALID_PASSWORD returns 400
      });

      it("should validate 2FA code successfully during login", async () => {
        const code = speakeasy.totp({ secret, encoding: "base32" });

        const res = await api("post", "/auth/2fa/validate").send({
          userId,
          code,
        });

        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"]).toBeDefined();
      });

      it("should reject invalid 2FA validation code", async () => {
        const res = await api("post", "/auth/2fa/validate").send({
          userId,
          code: "000000",
        });

        expect(res.status).toBe(400);
      });
    });
  });

  // ============================================================================
  // H. Forgot Password
  // ============================================================================

  describe("H. Forgot Password", () => {
    let userId: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
    });

    it("should send reset link (always 200 for security)", async () => {
      const res = await api("post", "/auth/forgot-password").send({
        email: TEST_EMAILS.default,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("reset link has been sent");
    });

    it("should return 200 for non-existent email (prevents enumeration)", async () => {
      const res = await api("post", "/auth/forgot-password").send({
        email: "nonexistent@example.com",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("reset link has been sent");
    });

    it("should reject invalid email", async () => {
      const res = await api("post", "/auth/forgot-password").send({
        email: "not-an-email",
      });

      expect(res.status).toBe(400);
    });

    it("should save reset token to database", async () => {
      await api("post", "/auth/forgot-password").send({
        email: TEST_EMAILS.default,
      });

      const result = await pool.query(
        `SELECT * FROM password_reset_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE u.email = $1`,
        [TEST_EMAILS.default]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].used_at).toBeNull();
    });

    describe("Reset Password", () => {
      it("should reset password with valid token", async () => {
        const token = "valid-reset-token";
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
          [userId, token]
        );

        const res = await api("post", "/auth/reset-password").send({
          token,
          newPassword: "NewPassword123",
          confirmPassword: "NewPassword123",
        });

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe("Password reset successfully");
      });

      it("should reject expired reset token", async () => {
        const token = "expired-token";
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at)
           VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
          [userId, token]
        );

        const res = await api("post", "/auth/reset-password").send({
          token,
          newPassword: "NewPassword123",
          confirmPassword: "NewPassword123",
        });

        expect(res.status).toBe(401);
      });

      it("should reject already used token", async () => {
        const token = "used-token";
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at, used_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour', NOW())`,
          [userId, token]
        );

        const res = await api("post", "/auth/reset-password").send({
          token,
          newPassword: "NewPassword123",
          confirmPassword: "NewPassword123",
        });

        expect(res.status).toBe(401);
      });

      it("should reject mismatched passwords", async () => {
        const res = await api("post", "/auth/reset-password").send({
          token: "any-token",
          newPassword: "NewPassword123",
          confirmPassword: "DifferentPassword",
        });

        expect(res.status).toBe(400);
      });

      it("should revoke all tokens after reset", async () => {
        const token = "valid-reset-token-2";
        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
          [userId, token]
        );
        await pool.query(
          `INSERT INTO refresh_tokens (user_id, token, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
          [userId, "some-refresh-token"]
        );

        await api("post", "/auth/reset-password").send({
          token,
          newPassword: "NewPassword123",
          confirmPassword: "NewPassword123",
        });

        const result = await pool.query(
          "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
          [userId]
        );
        expect(result.rows[0].revoked_at).not.toBeNull();
      });
    });
  });

  // ============================================================================
  // I. Delete Account Flow
  // ============================================================================

  describe("I. Delete Account Flow", () => {
    let userId: string;
    let accessToken: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
      accessToken = generateAccessToken(userId, user.email);
    });

    it("should soft-delete account with valid password", async () => {
      const res = await apiAuth("delete", "/users/account", accessToken).send({
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("30 days");

      const result = await pool.query(
        "SELECT deleted_at, restore_token FROM users WHERE id = $1",
        [userId]
      );
      expect(result.rows[0].deleted_at).not.toBeNull();
      expect(result.rows[0].restore_token).not.toBeNull();
    });

    it("should reject wrong password", async () => {
      const res = await apiAuth("delete", "/users/account", accessToken).send({
        password: "WrongPassword",
      });

      expect(res.status).toBe(400); // INVALID_PASSWORD returns 400
    });

    it("should revoke all tokens on deletion", async () => {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [userId, "test-token"]
      );

      await apiAuth("delete", "/users/account", accessToken).send({
        password: TEST_PASSWORD,
      });

      const result = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
        [userId]
      );
      expect(result.rows[0].revoked_at).not.toBeNull();
    });

    it("should prevent duplicate deletion", async () => {
      await apiAuth("delete", "/users/account", accessToken).send({
        password: TEST_PASSWORD,
      });

      const res = await apiAuth("delete", "/users/account", accessToken).send({
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(409);
    });
  });

  // ============================================================================
  // J. Deleted Account Login
  // ============================================================================

  describe("J. Deleted Account Login", () => {
    it("should reject login for deleted account with clear message", async () => {
      await createVerifiedUser(tenantId);

      await pool.query(
        "UPDATE users SET deleted_at = NOW() WHERE email = $1",
        [TEST_EMAILS.default]
      );

      const res = await api("post", "/auth/login").send({
        email: TEST_EMAILS.default,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("ACCOUNT_DELETED");
    });
  });

  // ============================================================================
  // K. Account Restoration
  // ============================================================================

  describe("K. Account Restoration", () => {
    let userId: string;
    const restoreToken = "valid-restore-token";

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;

      await pool.query(
        `UPDATE users SET
          deleted_at = NOW(),
          restore_token = $1,
          restore_token_expires_at = NOW() + INTERVAL '30 days'
         WHERE id = $2`,
        [restoreToken, userId]
      );
    });

    it("should restore account with valid token", async () => {
      const res = await api("post", "/users/account/restore").send({
        token: restoreToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Account restored successfully");

      const result = await pool.query(
        "SELECT deleted_at FROM users WHERE id = $1",
        [userId]
      );
      expect(result.rows[0].deleted_at).toBeNull();
    });

    it("should reject expired restore token", async () => {
      await pool.query(
        `UPDATE users SET restore_token_expires_at = NOW() - INTERVAL '1 day'
         WHERE id = $1`,
        [userId]
      );

      const res = await api("post", "/users/account/restore").send({
        token: restoreToken,
      });

      expect(res.status).toBe(401);
    });

    it("should reject invalid restore token", async () => {
      const res = await api("post", "/users/account/restore").send({
        token: "invalid-token",
      });

      expect(res.status).toBe(401);
    });

    it("should allow login after restoration", async () => {
      await api("post", "/users/account/restore").send({
        token: restoreToken,
      });

      const res = await api("post", "/auth/login").send({
        email: TEST_EMAILS.default,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
    });
  });

  // ============================================================================
  // L. Session Expiry & Token Refresh
  // ============================================================================

  describe("L. Session Expiry & Token Refresh", () => {
    let userId: string;
    let userEmail: string;
    let refreshToken: string;

    beforeEach(async () => {
      const user = await createVerifiedUser(tenantId);
      userId = user.id;
      userEmail = user.email;
      refreshToken = generateRefreshToken(userId, userEmail);
      await storeRefreshToken(userId, refreshToken);
    });

    it("should reject expired access token", async () => {
      const expiredToken = jwt.sign(
        { userId, email: userEmail },
        config.jwtSecret,
        { expiresIn: "1ms" }
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      const res = await apiAuth("get", "/users/profile", expiredToken);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("TOKEN_EXPIRED");
    });

    it("should refresh tokens with valid refresh token", async () => {
      const res = await api("post", "/auth/refresh").set(
        "Cookie",
        `refreshToken=${refreshToken}`
      );

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject missing refresh token", async () => {
      const res = await api("post", "/auth/refresh");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject revoked refresh token", async () => {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1",
        [refreshToken]
      );

      const res = await api("post", "/auth/refresh").set(
        "Cookie",
        `refreshToken=${refreshToken}`
      );

      expect(res.status).toBe(401);
    });

    it("should revoke old token after refresh", async () => {
      await api("post", "/auth/refresh").set(
        "Cookie",
        `refreshToken=${refreshToken}`
      );

      const result = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE token = $1",
        [refreshToken]
      );
      expect(result.rows[0].revoked_at).not.toBeNull();
    });

    describe("Logout", () => {
      let accessToken: string;

      beforeEach(() => {
        accessToken = generateAccessToken(userId, userEmail);
      });

      it("should logout successfully", async () => {
        const res = await apiAuthWithRefresh(
          "post",
          "/auth/logout",
          accessToken,
          refreshToken
        );

        expect(res.status).toBe(200);
        expect(res.body.data.message).toBe("Logged out successfully");
      });

      it("should reject logout without refresh token", async () => {
        const res = await apiAuth("post", "/auth/logout", accessToken);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      });

      it("should reject logout without access token", async () => {
        const res = await api("post", "/auth/logout").set(
          "Cookie",
          `refreshToken=${refreshToken}`
        );

        expect(res.status).toBe(401);
      });

      it("should be idempotent (already revoked)", async () => {
        await apiAuthWithRefresh(
          "post",
          "/auth/logout",
          accessToken,
          refreshToken
        );

        const res = await apiAuthWithRefresh(
          "post",
          "/auth/logout",
          accessToken,
          refreshToken
        );

        expect(res.status).toBe(200);
      });
    });
  });
});

// ============================================================================
// M. Tenant Registration (admin endpoint)
// ============================================================================

const adminApi = (method: "get" | "post", path: string) => {
  return request(app)[method](`/api/v1${path}`)
    .set("X-Admin-Secret", "test-admin-secret");
};

describe("M. Tenant Registration", () => {
  it("should register a tenant without appUrl", async () => {
    const res = await adminApi("post", "/tenants").send({
      name: "NewApp",
      ownerEmail: "owner@newapp.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.tenant).toMatchObject({
      name: "NewApp",
      owner_email: "owner@newapp.com",
    });
    expect(res.body.data.tenant.app_url).toBeNull();

    await pool.query("DELETE FROM tenants WHERE name = 'NewApp'");
  });

  it("should register a tenant with appUrl and persist it", async () => {
    const res = await adminApi("post", "/tenants").send({
      name: "TallyTest",
      ownerEmail: "owner@tally.com",
      appUrl: "https://tally.vercel.app",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.tenant.app_url).toBe("https://tally.vercel.app");

    await pool.query("DELETE FROM tenants WHERE name = 'TallyTest'");
  });

  it("should reject duplicate tenant name", async () => {
    await adminApi("post", "/tenants").send({
      name: "DupApp",
      ownerEmail: "a@dup.com",
    });

    const res = await adminApi("post", "/tenants").send({
      name: "DupApp",
      ownerEmail: "b@dup.com",
    });

    expect(res.status).toBe(409);

    await pool.query("DELETE FROM tenants WHERE name = 'DupApp'");
  });

  it("should attach tenantAppUrl to request when tenant has app_url set", async () => {
    const regRes = await adminApi("post", "/tenants").send({
      name: "AppUrlTenant",
      ownerEmail: "owner@appurl.com",
      appUrl: "https://appurl-tenant.vercel.app",
    });

    const tenantApiKey: string = regRes.body.data.tenant.api_key;

    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", tenantApiKey)
      .send({
        email: "newuser@appurl.com",
        password: "Password123!",
        termsAccepted: true,
      });

    expect(res.status).toBe(201);

    await pool.query("DELETE FROM tenants WHERE name = 'AppUrlTenant'");
  });
});
