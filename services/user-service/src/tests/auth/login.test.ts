import bcrypt from "bcrypt";
import request from "supertest";

import app from "../../app";
import { pool } from "../../config/database";

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "%example.com%",
    ]);

    const passwordHash = await bcrypt.hash("Password123", 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, email_verified, terms_accepted, terms_accepted_at)
    VALUES ($1, $2, true, true, NOW())`,
      ["test@example.com", passwordHash],
    );
  });

  it("should login successfully with valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "Password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "Password12345",
    });

    expect(res.status).toBe(401);
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "wrong@example.com",
      password: "Password123",
    });

    expect(res.status).toBe(401);
  });

  it("should return 403 for unverified email", async () => {
    const passwordHash = await bcrypt.hash("Password123", 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, email_verified, terms_accepted, terms_accepted_at)
     VALUES ($1, $2, false, true, NOW())`,
      ["unverified@example.com", passwordHash],
    );

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "unverified@example.com",
      password: "Password123",
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should return 401 for deleted account", async () => {
    await pool.query("UPDATE users SET deleted_at = NOW() WHERE email = $1", [
      "test@example.com",
    ]);

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "Password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_DELETED");
  });
});
