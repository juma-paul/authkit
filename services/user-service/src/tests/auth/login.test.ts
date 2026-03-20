import request from "supertest";
import app from "../../app";
import {
  cleanupTestData,
  createTestUser,
  getTestTenantId,
  TEST_API_KEY,
} from "../helpers/testHelpers";

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
  });

  it("should login successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "wrong@example.com", password: "Password123" });

    expect(res.status).toBe(401);
  });

  it("should return 403 for unverified email", async () => {
    await createTestUser(tenantId, {
      email: "unverified@example.com",
      emailVerified: false,
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "unverified@example.com", password: "Password123" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should return 401 for deleted account", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com", password: "Password123" });

    const { pool } = await import("../../config/database");
    await pool.query("UPDATE users SET deleted_at = NOW() WHERE email = $1", [
      "test@example.com",
    ]);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("X-API-Key", TEST_API_KEY)
      .send({ email: "test@example.com", password: "Password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_DELETED");
  });
});
