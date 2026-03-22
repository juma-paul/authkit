import request from "supertest";
import app from "../../app";
import { cleanupTestData, TEST_API_KEY } from "../helpers/testHelpers";

describe("POST /api/v1/auth/register", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  const userData = {
    email: "test@example.com",
    password: "Password123",
    confirmPassword: "Password123",
    termsAccepted: true,
  };
  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send(userData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.email).toBe("test@example.com");
  });

  it("should return 409 for duplicate email", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send(userData);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send(userData);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("should return 400 for mismatched passwords", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password456",
        termsAccepted: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when terms not accepted", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        termsAccepted: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for weak password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        email: "test@example.com",
        password: "weak",
        confirmPassword: "weak",
        termsAccepted: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("X-API-Key", TEST_API_KEY)
      .send({
        email: "notanemail",
        password: "Password123",
        confirmPassword: "Password123",
        termsAccepted: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
