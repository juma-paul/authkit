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

describe("PUT /api/v1/users/profile", () => {
  let accessToken: string;

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    accessToken = generateTestToken(user.id, user.email);
  });

  it("should update first_name and last_name successfully", async () => {
    const res = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ first_name: "John", last_name: "Doe" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.first_name).toBe("John");
    expect(res.body.data.user.last_name).toBe("Doe");
  });

  it("should update only first_name without affecting last_name", async () => {
    // First set both names
    await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ first_name: "John", last_name: "Doe" });

    // Then update only first_name
    const res = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ first_name: "Jane" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.first_name).toBe("Jane");
    expect(res.body.data.user.last_name).toBe("Doe"); 
  });

  it("should return 400 for invalid avatar_url", async () => {
    const res = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ avatar_url: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app)
      .put("/api/v1/users/profile")
      .set("X-API-Key", TEST_API_KEY)
      .send({ first_name: "John" });

    expect(res.status).toBe(401);
  });

  it("should not return sensitive fields", async () => {
    const res = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY)
      .send({ first_name: "John" });

    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.restore_token).toBeUndefined();
  });
});
