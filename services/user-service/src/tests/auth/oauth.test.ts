import request from "supertest";
import app from "../../app";
import { pool } from "../../config/database";
import {
  cleanupTestData,
  getTestTenantId,
  TEST_API_KEY,
} from "../helpers/testHelpers";

// Mock passport to avoid real OAuth calls
jest.mock("passport", () => ({
  initialize: () => (req: any, res: any, next: any) => next(),
  authenticate:
    (strategy: string, options: any) => (req: any, res: any, next: any) => {
      if (req.path.includes("callback")) {
        req.user = { id: "mock-user-id", email: "test@example.com" };
        next();
      } else {
        res.redirect(`https://${strategy}.com/oauth`);
      }
    },
  use: jest.fn(),
}));

let tenantId: string;

beforeAll(async () => {
  tenantId = await getTestTenantId();
});

describe("OAuth", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  describe("GET /api/v1/auth/oauth/url", () => {
    it("should return Google OAuth URL", async () => {
      const res = await request(app)
        .get("/api/v1/auth/oauth/url")
        .set("X-API-Key", TEST_API_KEY)
        .query({ provider: "google" });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain("/auth/google");
      expect(res.body.data.url).toContain("state=");
    });

    it("should return GitHub OAuth URL", async () => {
      const res = await request(app)
        .get("/api/v1/auth/oauth/url")
        .set("X-API-Key", TEST_API_KEY)
        .query({ provider: "github" });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain("/auth/github");
      expect(res.body.data.url).toContain("state=");
    });

    it("should return 400 for invalid provider", async () => {
      const res = await request(app)
        .get("/api/v1/auth/oauth/url")
        .set("X-API-Key", TEST_API_KEY)
        .query({ provider: "twitter" });

      expect(res.status).toBe(400);
    });

    it("should return 401 with no API key", async () => {
      const res = await request(app)
        .get("/api/v1/auth/oauth/url")
        .query({ provider: "google" });

      expect(res.status).toBe(401);
    });
  });
});
