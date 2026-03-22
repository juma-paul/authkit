import request from "supertest";
import app from "../../app";
import {
  cleanupTestData,
  getTestTenantId,
  TEST_API_KEY,
} from "../helpers/testHelpers";

const ADMIN_SECRET = "test-admin-secret";

beforeAll(async () => {
  await getTestTenantId();
});

describe("POST /api/v1/tenants", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  it("should create tenant with valid admin secret", async () => {
    const res = await request(app)
      .post("/api/v1/tenants")
      .set("X-Admin-Secret", ADMIN_SECRET)
      .send({ name: "TestApp", ownerEmail: "owner@testapp.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.tenant.name).toBe("TestApp");
    expect(res.body.data.tenant.api_key).toBeDefined();
  });

  it("should return 401 with wrong admin secret", async () => {
    const res = await request(app)
      .post("/api/v1/tenants")
      .set("X-Admin-Secret", "wrong-secret")
      .send({ name: "TestApp", ownerEmail: "owner@testapp.com" });

    expect(res.status).toBe(401);
  });

  it("should return 401 with no admin secret", async () => {
    const res = await request(app)
      .post("/api/v1/tenants")
      .send({ name: "TestApp", ownerEmail: "owner@testapp.com" });

    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/tenants")
      .set("X-Admin-Secret", ADMIN_SECRET)
      .send({ name: "TestApp", ownerEmail: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("should return 409 for duplicate tenant name", async () => {
    await request(app)
      .post("/api/v1/tenants")
      .set("X-Admin-Secret", ADMIN_SECRET)
      .send({ name: "TestApp", ownerEmail: "owner1@testapp.com" });

    const res = await request(app)
      .post("/api/v1/tenants")
      .set("X-Admin-Secret", ADMIN_SECRET)
      .send({ name: "TestApp", ownerEmail: "owner2@testapp.com" });

    expect(res.status).toBe(409);
  });
});
