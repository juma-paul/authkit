import request from "supertest";
import speakeasy from "speakeasy";
import app from "../../app";
import { pool } from "../../config/database";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
  generateTestToken,
  TEST_API_KEY,
} from "../helpers/testHelpers";

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("2FA", () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    userId = user.id;
    accessToken = generateTestToken(user.id, user.email);
  });

  describe("POST /api/v1/users/2fa/setup", () => {
    it("should return QR code and secret", async () => {
      const res = await request(app)
        .post("/api/v1/users/2fa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.qrCode).toBeDefined();
      expect(res.body.data.secret).toBeDefined();
    });

    it("should return 401 when no token provided", async () => {
      const res = await request(app)
        .post("/api/v1/users/2fa/setup")
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/users/2fa/verify", () => {
    let secret: string;

    beforeEach(async () => {
      // Setup 2FA first
      secret = speakeasy.generateSecret().base32;
      await pool.query(
        `INSERT INTO two_factor_auth (user_id, secret, enabled)
         VALUES ($1, $2, false)`,
        [userId, secret],
      );
    });

    it("should enable 2FA with valid code", async () => {
      const code = speakeasy.totp({
        secret,
        encoding: "base32",
      });

      const res = await request(app)
        .post("/api/v1/users/2fa/verify")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ code });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("2FA enabled successfully");
    });

    it("should return 401 for invalid code", async () => {
      const res = await request(app)
        .post("/api/v1/users/2fa/verify")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ code: "000000" });

      expect(res.status).toBe(401);
    });

    it("should return backup codes when 2FA enabled", async () => {
      const code = speakeasy.totp({ secret, encoding: "base32" });

      const res = await request(app)
        .post("/api/v1/users/2fa/verify")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ code });

      expect(res.body.data.backupCodes).toBeDefined();
      expect(res.body.data.backupCodes).toHaveLength(10);
    });
  });

  describe("POST /api/v1/users/2fa/disable", () => {
    let secret: string;

    beforeEach(async () => {
      secret = speakeasy.generateSecret().base32;
      await pool.query(
        `INSERT INTO two_factor_auth (user_id, secret, enabled)
         VALUES ($1, $2, true)`,
        [userId, secret],
      );
    });

    it("should disable 2FA with valid code", async () => {
      const code = speakeasy.totp({ secret, encoding: "base32" });

      const res = await request(app)
        .post("/api/v1/users/2fa/disable")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ code });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("2FA disabled successfully");
    });

    it("should return 401 for invalid code", async () => {
      const res = await request(app)
        .post("/api/v1/users/2fa/disable")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ code: "000000" });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/2fa/validate", () => {
    let secret: string;

    beforeEach(async () => {
      secret = speakeasy.generateSecret().base32;
      await pool.query(
        `INSERT INTO two_factor_auth (user_id, secret, enabled)
         VALUES ($1, $2, true)`,
        [userId, secret],
      );
    });

    it("should return tokens for valid code", async () => {
      const code = speakeasy.totp({ secret, encoding: "base32" });

      const res = await request(app)
        .post("/api/v1/auth/2fa/validate")
        .set("X-API-Key", TEST_API_KEY)
        .send({ userId, code });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it("should return 401 for invalid code", async () => {
      const res = await request(app)
        .post("/api/v1/auth/2fa/validate")
        .set("X-API-Key", TEST_API_KEY)
        .send({ userId, code: "000000" });

      expect(res.status).toBe(401);
    });
  });
});
