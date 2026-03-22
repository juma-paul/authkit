import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app";
import { pool } from "../../config/database";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
  generateTestRefreshToken,
  TEST_API_KEY,
} from "../helpers/testHelpers";
import { config } from "../../config/env";

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("POST /api/v1/auth/refresh", () => {
  let userId: string;
  let userEmail: string;
  let refreshToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    userId = user.id;
    userEmail = user.email;

    // Insert valid refresh token
    refreshToken = generateTestRefreshToken(userId, userEmail);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, refreshToken],
    );
  });

  it("should return new tokens for valid refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-API-Key", TEST_API_KEY)
      .set("Cookie", `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("should return 400 when no refresh token provided", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-API-Key", TEST_API_KEY);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 for expired refresh token", async () => {
    const expiredToken = jwt.sign(
      { userId, email: userEmail },
      config.jwtRefreshSecret,
      { expiresIn: "1ms" },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-API-Key", TEST_API_KEY)
      .set("Cookie", `refreshToken=${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("should return 401 for revoked refresh token", async () => {
    // Revoke the token
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1",
      [refreshToken],
    );

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-API-Key", TEST_API_KEY)
      .set("Cookie", `refreshToken=${refreshToken}`);

    expect(res.status).toBe(401);
  });

  it("should revoke old token after refresh", async () => {
    await request(app)
      .post("/api/v1/auth/refresh")
      .set("X-API-Key", TEST_API_KEY)
      .set("Cookie", `refreshToken=${refreshToken}`);

    // Old token should now be revoked
    const result = await pool.query(
      "SELECT revoked_at FROM refresh_tokens WHERE token = $1",
      [refreshToken],
    );
    expect(result.rows[0].revoked_at).not.toBeNull();
  });
});
