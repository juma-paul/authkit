import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../../app";
import { config } from "../../config/env";

describe("GET /test/protected", () => {
  it("should return 401 when no token provided", async () => {
    const res = await request(app).get("/test/protected");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 for invalid token", async () => {
    const res = await request(app)
      .get("/test/protected")
      .set("Cookie", `accessToken=invalidToken`);

    expect(res.status).toBe(401);
  });

  it("should return 401 for expired token", async () => {
    const expiredToken = jwt.sign(
      { userId: "123", email: "test@example.com" },
      config.jwtSecret,
      { expiresIn: "1ms" },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    const res = await request(app)
      .get("/test/protected")
      .set("Cookie", `accessToken=${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("should allow access with a valid token", async () => {
    const token = jwt.sign(
      { userId: "123", email: "test@example.com" },
      config.jwtSecret,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .get("/test/protected")
      .set("Cookie", `accessToken=${token}`);

    expect(res.status).toBe(200);
  });
});
