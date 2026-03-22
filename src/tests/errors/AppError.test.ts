import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  InternalError,
  TokenExpiredError,
  AccountDeletedError,
} from "../../errors/AppError";

describe("AppError Classes", () => {
  describe("NotFoundError", () => {
    it("should have correct statusCode and code", () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
    });
    it("should accept custom message", () => {
      const error = new NotFoundError("User not found");
      expect(error.message).toBe("User not found");
    });
  });

  describe("UnauthorizedError", () => {
    it("should have correct statusCode and code", () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("ConflictError", () => {
    it("should have correct statusCode and code", () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
    });
  });

  describe("ValidationError", () => {
    it("should have correct statusCode and code", () => {
      const error = new ValidationError();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("ForbiddenError", () => {
    it("should have correct statusCode and code", () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  describe("InternalError", () => {
    it("should have correct statusCode and code", () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("TokenExpiredError", () => {
    it("should have correct statusCode and code", () => {
      const error = new TokenExpiredError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("TOKEN_EXPIRED");
    });
  });

  describe("AccountDeletedError", () => {
    it("should have correct statusCode and code", () => {
      const error = new AccountDeletedError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("ACCOUNT_DELETED");
    });
  });
});
