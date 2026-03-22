import request from "supertest";
import app from "../../app";
import { pool } from "../../config/database";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
  generateTestToken,
  TEST_API_KEY,
} from "../helpers/testHelpers";

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
    },
  })),
}));

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("Email Verification", () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: false,
    });
    userId = user.id;
    accessToken = generateTestToken(user.id, user.email);
  });

  describe("POST /api/v1/auth/send-verification", () => {
    it("should send verification email successfully", async () => {
      const res = await request(app)
        .post("/api/v1/auth/send-verification")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Verification email sent");
    });

    it("should return 200 if already verified", async () => {
      await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
        userId,
      ]);

      const res = await request(app)
        .post("/api/v1/auth/send-verification")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Email already verified");
    });

    it("should return 401 when no token provided", async () => {
      const res = await request(app)
        .post("/api/v1/auth/send-verification")
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/verify-email", () => {
    it("should verify email successfully", async () => {
      // Insert verification token
      const token = "valid-test-token-123";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, token],
      );

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Email verified successfully");

      // Check user is verified
      const user = await pool.query(
        "SELECT email_verified FROM users WHERE id = $1",
        [userId],
      );
      expect(user.rows[0].email_verified).toBe(true);
    });

    it("should return 401 for expired token", async () => {
      const token = "expired-token-123";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
        [userId, token],
      );

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token });

      expect(res.status).toBe(401);
    });

    it("should return 401 for already used token", async () => {
      const token = "used-token-123";
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at, used_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours', NOW())`,
        [userId, token],
      );

      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token });

      expect(res.status).toBe(401);
    });

    it("should return 400 for missing token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/verify-email")
        .set("X-API-Key", TEST_API_KEY)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/resend-verification", () => {
    it("should resend verification email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Verification email sent");
    });
  });
});
