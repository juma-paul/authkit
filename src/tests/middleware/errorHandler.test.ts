import request from "supertest";
import app from "../../app";

describe("errorHandler", () => {
  it("should handle unknown errors with 500", async () => {
    const res = await request(app).get("/test/error/unknown");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("should return healthy status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("healthy");
  });

  it("should handle AppError correctly", async () => {
    const res = await request(app).get("/test/error/apperror");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
