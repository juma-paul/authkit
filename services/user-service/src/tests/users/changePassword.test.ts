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

describe("PUT /api/v1/users/change-password", () => {
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

  it("should change password successfully", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-password")
      .set('Cookie', `accessToken=${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({
        currentPassword: "Password123",
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe("Password changed successfully");
  });

  it("should return 401 for wrong current password", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-password")
      .set('Cookie', `accessToken=${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({
        currentPassword: "WrongPassword",
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(401);
  });

  it("should return 400 for mismatched new passwords", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-password")
      .set('Cookie', `accessToken=${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({
        currentPassword: "Password123",
        newPassword: "NewPassword123",
        confirmPassword: "DifferentPassword123",
      });

    expect(res.status).toBe(400);
  });

  it("should revoke all refresh tokens after password change", async () => {
    // Insert a refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, "test-token-123"],
    );

    await request(app)
      .put("/api/v1/users/change-password")
      .set('Cookie', `accessToken=${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({
        currentPassword: "Password123",
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    const result = await pool.query(
      "SELECT revoked_at FROM refresh_tokens WHERE user_id = $1",
      [userId],
    );
    expect(result.rows[0].revoked_at).not.toBeNull();
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-password")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        currentPassword: "Password123",
        newPassword: "NewPassword123",
        confirmPassword: "NewPassword123",
      });

    expect(res.status).toBe(401);
  });
});
