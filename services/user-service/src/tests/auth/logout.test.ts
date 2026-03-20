import request from "supertest";
import app from "../../app";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
  generateTestToken,
  TEST_API_KEY,
} from "../helpers/testHelpers";
import { pool } from "../../config/database";

let tenantId: string;
let accessToken: string;
let refreshToken: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("POST /api/v1/auth/logout", () => {
  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });

    accessToken = generateTestToken(user.id, user.email);

    // Insert a real refresh token
    refreshToken = generateTestToken(user.id, user.email);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken],
    );
  });

  it("should logout successfully with valid refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe("Logged out successfully");
  });

  it("should return 400 when no refresh token provided", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when no access token provided", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("X-API-Key", TEST_API_KEY)
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it("should return 200 for already revoked token", async () => {
    // Logout twice
    await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ refreshToken });

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });
});
