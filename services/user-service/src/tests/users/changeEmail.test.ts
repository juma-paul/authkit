import request from "supertest";
import app from "../../app";
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

describe("PUT /api/v1/users/change-email", () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    accessToken = generateTestToken(user.id, user.email);
  });

  it("should change email successfully", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-email")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "newemail@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain("verify your new email");
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-email")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "newemail@example.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
  });

  it("should return 409 for already taken email", async () => {
    await createTestUser(tenantId, {
      email: "taken@example.com",
      emailVerified: true,
    });

    const res = await request(app)
      .put("/api/v1/users/change-email")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "taken@example.com", password: "Password123" });

    expect(res.status).toBe(409);
  });

  it("should return 400 for invalid email", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-email")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "not-an-email", password: "Password123" });

    expect(res.status).toBe(400);
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app)
      .put("/api/v1/users/change-email")
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "newemail@example.com", password: "Password123" });

    expect(res.status).toBe(401);
  });

  it("should set email_verified to false after change", async () => {
    await request(app)
      .put("/api/v1/users/change-email")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ newEmail: "newemail@example.com", password: "Password123" });

    const { pool } = await import("../../config/database");
    const result = await pool.query(
      "SELECT email_verified FROM users WHERE email = $1",
      ["newemail@example.com"],
    );
    expect(result.rows[0].email_verified).toBe(false);
  });
});
