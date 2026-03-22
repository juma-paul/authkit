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

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("Account Deletion + Restore", () => {
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

  describe("DELETE /api/v1/users/account", () => {
    it("should soft delete account successfully", async () => {
      const res = await request(app)
        .delete("/api/v1/users/account")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ password: "Password123" });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("30 days");

      // Verify deleted_at is set
      const result = await pool.query(
        "SELECT deleted_at, restore_token FROM users WHERE id = $1",
        [userId],
      );
      expect(result.rows[0].deleted_at).not.toBeNull();
      expect(result.rows[0].restore_token).not.toBeNull();
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app)
        .delete("/api/v1/users/account")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ password: "WrongPassword" });

      expect(res.status).toBe(401);
    });

    it("should return 409 if already deleted", async () => {
      // Delete first time
      await request(app)
        .delete("/api/v1/users/account")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ password: "Password123" });

      // Try to delete again
      const res = await request(app)
        .delete("/api/v1/users/account")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ password: "Password123" });

      expect(res.status).toBe(409);
    });

    it("should revoke all refresh tokens", async () => {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [userId, "test-token"],
      );

      await request(app)
        .delete("/api/v1/users/account")
        .set('Cookie', `accessToken=${accessToken}`)
        .set("X-API-Key", TEST_API_KEY)
        .send({ password: "Password123" });

      const result = await pool.query(
        "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
        [userId],
      );
      expect(result.rows[0].revoked_at).not.toBeNull();
    });
  });

  describe("POST /api/v1/users/account/restore", () => {
    let restoreToken: string;

    beforeEach(async () => {
      // Soft delete first
      await pool.query(
        `UPDATE users SET 
          deleted_at = NOW(),
          restore_token = 'valid-restore-token',
          restore_token_expires_at = NOW() + INTERVAL '30 days'
         WHERE id = $1`,
        [userId],
      );
      restoreToken = "valid-restore-token";
    });

    it("should restore account successfully", async () => {
      const res = await request(app)
        .post("/api/v1/users/account/restore")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token: restoreToken });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Account restored successfully");

      // Verify deleted_at is cleared
      const result = await pool.query(
        "SELECT deleted_at FROM users WHERE id = $1",
        [userId],
      );
      expect(result.rows[0].deleted_at).toBeNull();
    });

    it("should return 401 for expired restore token", async () => {
      await pool.query(
        `UPDATE users SET restore_token_expires_at = NOW() - INTERVAL '1 day'
         WHERE id = $1`,
        [userId],
      );

      const res = await request(app)
        .post("/api/v1/users/account/restore")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token: restoreToken });

      expect(res.status).toBe(401);
    });

    it("should return 401 for invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/users/account/restore")
        .set("X-API-Key", TEST_API_KEY)
        .send({ token: "invalid-token" });

      expect(res.status).toBe(401);
    });
  });
});
