import jwt from "jsonwebtoken";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../app";
import { pool } from "../../config/database";
import { config } from "../../config/env";

describe("GET /api/v1/users/profile", () => {
  let accessToken: string;

  beforeEach(async () => {
    // Clean and create verified test user
    await pool.query("DELETE FROM users WHERE email LIKE $1", [
      "%example.com%",
    ]);
    const passwordHash = await bcrypt.hash("password123", 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, email_verified, terms_accepted, terms_accepted_at)
            VALUES($1, $2, true, true, NOW()) 
            RETURNING id, email`,
      ["test@example.com", passwordHash],
    );

    // Generate valid token
    accessToken = jwt.sign(
      { userId: result.rows[0].id, email: result.rows[0].id },
      config.jwtSecret,
      { expiresIn: "1h" },
    );
  });

  it("should return 200 with data for valid token", async () => {
    const res = await request(app)
      .get("/api/v1/users/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("test@example.com");
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it("should return 401 when no token provided", async () => {
    const res = await request(app).get("/api/v1/users/profile");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/users/profile")
      .set("Authorization", `Bearer invalidToken`);

    expect(res.status).toBe(401);
  });
});
