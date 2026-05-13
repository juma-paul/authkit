/**
 * Auth Service - Unit Tests
 *
 * Pure unit tests without HTTP requests or database dependencies.
 * Tests error classes, utility functions, and validation logic.
 */

import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  InternalError,
  TokenExpiredError,
  AccountDeletedError,
  InvalidCredentialsError,
} from "../errors/AppError";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { sendSuccess, sendError } from "../utils/response";

// ============================================================================
// Test Utilities
// ============================================================================

const mockResponse = () => {
  const res: {
    status: jest.Mock;
    json: jest.Mock;
  } = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

// ============================================================================
// Error Classes Tests
// ============================================================================

describe("Unit Tests", () => {
  describe("Error Classes", () => {
    describe("NotFoundError", () => {
      it("should have statusCode 404 and code NOT_FOUND", () => {
        const error = new NotFoundError();

        expect(error.statusCode).toBe(404);
        expect(error.code).toBe("NOT_FOUND");
        expect(error.message).toBe("Resource not found");
      });

      it("should accept custom message", () => {
        const error = new NotFoundError("User not found");

        expect(error.message).toBe("User not found");
        expect(error.statusCode).toBe(404);
      });
    });

    describe("UnauthorizedError", () => {
      it("should have statusCode 401 and code UNAUTHORIZED", () => {
        const error = new UnauthorizedError();

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe("UNAUTHORIZED");
      });

      it("should accept custom message", () => {
        const error = new UnauthorizedError("Invalid token");

        expect(error.message).toBe("Invalid token");
      });
    });

    describe("ConflictError", () => {
      it("should have statusCode 409 and code CONFLICT", () => {
        const error = new ConflictError();

        expect(error.statusCode).toBe(409);
        expect(error.code).toBe("CONFLICT");
      });

      it("should accept custom message", () => {
        const error = new ConflictError("Email already registered");

        expect(error.message).toBe("Email already registered");
      });
    });

    describe("ValidationError", () => {
      it("should have statusCode 400 and code VALIDATION_ERROR", () => {
        const error = new ValidationError();

        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("VALIDATION_ERROR");
      });

      it("should accept custom message", () => {
        const error = new ValidationError("Invalid email format");

        expect(error.message).toBe("Invalid email format");
      });
    });

    describe("InvalidCredentialsError", () => {
      it("should have statusCode 400 and code INVALID_PASSWORD", () => {
        const error = new InvalidCredentialsError();

        expect(error.statusCode).toBe(400);
        expect(error.code).toBe("INVALID_PASSWORD");
      });
    });

    describe("ForbiddenError", () => {
      it("should have statusCode 403 and code FORBIDDEN", () => {
        const error = new ForbiddenError();

        expect(error.statusCode).toBe(403);
        expect(error.code).toBe("FORBIDDEN");
      });
    });

    describe("InternalError", () => {
      it("should have statusCode 500 and code INTERNAL_ERROR", () => {
        const error = new InternalError();

        expect(error.statusCode).toBe(500);
        expect(error.code).toBe("INTERNAL_ERROR");
      });
    });

    describe("TokenExpiredError", () => {
      it("should have statusCode 401 and code TOKEN_EXPIRED", () => {
        const error = new TokenExpiredError();

        expect(error.statusCode).toBe(401);
        expect(error.code).toBe("TOKEN_EXPIRED");
      });
    });

    describe("AccountDeletedError", () => {
      it("should have statusCode 403 and code ACCOUNT_DELETED", () => {
        const error = new AccountDeletedError();

        expect(error.statusCode).toBe(403);
        expect(error.code).toBe("ACCOUNT_DELETED");
      });
    });
  });

  // ============================================================================
  // Response Utilities Tests
  // ============================================================================

  describe("Response Utilities", () => {
    describe("sendSuccess", () => {
      it("should return success response with default 200 status", () => {
        const res = mockResponse();
        const data = { name: "Test User" };

        sendSuccess(res as any, data);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          statusCode: 200,
          data: { name: "Test User" },
        });
      });

      it("should return success response with custom status code", () => {
        const res = mockResponse();
        const data = { id: "123" };

        sendSuccess(res as any, data, 201);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          statusCode: 201,
          data: { id: "123" },
        });
      });

      it("should handle null data", () => {
        const res = mockResponse();

        sendSuccess(res as any, null);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          statusCode: 200,
          data: null,
        });
      });

      it("should handle array data", () => {
        const res = mockResponse();
        const data = [{ id: 1 }, { id: 2 }];

        sendSuccess(res as any, data);

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          statusCode: 200,
          data: [{ id: 1 }, { id: 2 }],
        });
      });
    });

    describe("sendError", () => {
      it("should return error response with correct structure", () => {
        const res = mockResponse();
        const error = new NotFoundError("User not found");

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 404,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      });

      it("should handle ValidationError", () => {
        const res = mockResponse();
        const error = new ValidationError("Email is required");

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email is required",
          },
        });
      });

      it("should handle UnauthorizedError", () => {
        const res = mockResponse();
        const error = new UnauthorizedError("Invalid token");

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 401,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid token",
          },
        });
      });

      it("should handle TokenExpiredError", () => {
        const res = mockResponse();
        const error = new TokenExpiredError();

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 401,
          error: {
            code: "TOKEN_EXPIRED",
            message: "Token has expired",
          },
        });
      });

      it("should handle AccountDeletedError", () => {
        const res = mockResponse();
        const error = new AccountDeletedError();

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 403,
          error: {
            code: "ACCOUNT_DELETED",
            message: ERROR_MESSAGES.ACCOUNT_DELETED,
          },
        });
      });

      it("should handle InternalError", () => {
        const res = mockResponse();
        const error = new InternalError();

        sendError(res as any, error);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          statusCode: 500,
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          },
        });
      });
    });
  });

  // ============================================================================
  // Error Code Consistency Tests (Frontend Integration)
  // ============================================================================

  describe("Error Code Consistency (Frontend Integration)", () => {
    it("TOKEN_EXPIRED should be 401 for interceptor refresh flow", () => {
      const error = new TokenExpiredError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("TOKEN_EXPIRED");
    });

    it("UNAUTHORIZED should be 401 for interceptor redirect", () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("ACCOUNT_DELETED should be 403 for interceptor redirect", () => {
      const error = new AccountDeletedError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("ACCOUNT_DELETED");
    });

    it("VALIDATION_ERROR should be 400 for form errors", () => {
      const error = new ValidationError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("INVALID_PASSWORD should be 400 for form errors", () => {
      const error = new InvalidCredentialsError();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("INVALID_PASSWORD");
    });
  });
});

// ============================================================================
// Email Service — per-tenant appUrl tests
// ============================================================================

const mockSend = jest.fn().mockResolvedValue({ id: "mock-id" });

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock("../config/env", () => ({
  config: {
    resendApiKey: "re_test",
    resendFromEmail: "noreply@example.com",
    appUrl: "https://global.example.com",
  },
}));

describe("Email Service — per-tenant appUrl", () => {
  beforeEach(() => mockSend.mockClear());

  it("sendVerificationEmail uses tenant appUrl when provided", async () => {
    const { sendVerificationEmail } = await import("../services/email.service");
    await sendVerificationEmail("u@test.com", "tok", "https://tenant.app");
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("https://tenant.app/verify-email?token=tok");
    expect(html).not.toContain("global.example.com");
  });

  it("sendVerificationEmail falls back to config.appUrl when omitted", async () => {
    const { sendVerificationEmail } = await import("../services/email.service");
    await sendVerificationEmail("u@test.com", "tok2");
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("https://global.example.com/verify-email?token=tok2");
  });

  it("sendPasswordResetEmail uses tenant appUrl when provided", async () => {
    const { sendPasswordResetEmail } = await import("../services/email.service");
    await sendPasswordResetEmail("u@test.com", "tok", "https://tenant.app");
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("https://tenant.app/reset-password?token=tok");
  });

  it("sendEmailChangeVerificationEmail uses tenant appUrl when provided", async () => {
    const { sendEmailChangeVerificationEmail } = await import("../services/email.service");
    await sendEmailChangeVerificationEmail("u@test.com", "tok", "https://tenant.app");
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("https://tenant.app/verify-email-change?token=tok");
  });

  it("sendAccountDeletionEmail uses tenant appUrl when provided", async () => {
    const { sendAccountDeletionEmail } = await import("../services/email.service");
    await sendAccountDeletionEmail("u@test.com", "tok", "https://tenant.app");
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("https://tenant.app/restore-account?token=tok");
  });
});
