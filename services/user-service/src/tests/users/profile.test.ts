import request from "supertest";

import app from "../../app";
import {
  cleanupTestData,
  createTestUser,
  generateTestToken,
  getTestTenantId,
  TEST_API_KEY,
} from "../helpers/testHelpers";

describe("GET /api/v1/users/profile", () => {
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    tenantId = await getTestTenantId();
  });

  beforeEach(async () => {
    await cleanupTestData();
    const user = await createTestUser(tenantId, {
      email: "test@example.com",
      emailVerified: true,
    });
    accessToken = generateTestToken(user.id, user.email);
  });

  it("should return 200 with data for valid token", async () => {
    const res = await request(app)
      .get("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-API-Key", TEST_API_KEY);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("test@example.com");
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app)
      .get("/api/v1/users/profile")
      .set("X-API-Key", TEST_API_KEY);

    expect(res.status).toBe(401);
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/users/profile")
      .set("Authorization", "Bearer invalidtoken")
      .set("X-API-Key", TEST_API_KEY);

    expect(res.status).toBe(401);
  });
});
