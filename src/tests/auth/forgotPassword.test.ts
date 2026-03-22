import request from "supertest";
import app from "../../app";
import { pool } from "../../config/database";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
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

// Forgot password
describe("POST /api/v1/auth/forgot-password", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
  });

  it("should return 200 for existing email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain("reset link has been sent");
  });

  it("should return 200 for non-existent email (security)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "nonexistent@example.com" });

    // Same response as real email - prevents enumeration
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain("reset link has been sent");
  });

  it("should return 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("should save reset token to database", async () => {
    await request(app)
      .post("/api/v1/auth/forgot-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com" });

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens pt
       JOIN users u ON u.id = pt.user_id
       WHERE u.email = $1`,
      ["test@example.com"],
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].used_at).toBeNull();
  });
});

// Reset Password
describe("POST /api/v1/auth/reset-password", () => {
  let userId: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    userId = user.id;
  });

  it("should reset password successfully", async () => {
    const token = "valid-reset-token";
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, token],
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        token,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe("Password reset successfully");
  });

  it("should return 401 for expired token", async () => {
    const token = "expired-token";
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() - INTERVAL '1 hour')`,
      [userId, token],
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        token,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(401);
  });

  it("should return 401 for already used token", async () => {
    const token = "used-token";
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, used_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', NOW())`,
      [userId, token],
    );

    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        token,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(401);
  });

  it("should return 400 for mismatched passwords", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        token: "any-token",
        newPassword: "NewPassword123",
        confirmPassword: "DifferentPassword123",
      });

    expect(res.status).toBe(400);
  });

  it("should revoke all refresh tokens after reset", async () => {
    const token = "valid-reset-token-2";
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, token],
    );
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, "some-refresh-token"],
    );

    await request(app)
      .post("/api/v1/auth/reset-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        token,
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    const result = await pool.query(
      "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
      [userId],
    );
    expect(result.rows[0].revoked_at).not.toBeNull();
  });
});
