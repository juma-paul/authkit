export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Invalid credentials") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input data") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, 500, "INTERNAL_ERROR");
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = "Token has expired") {
    super(message, 401, "TOKEN_EXPIRED");
  }
}

export class AccountDeletedError extends AppError {
  constructor(message = "Account has been deleted") {
    super(message, 401, "ACCOUNT_DELETED");
  }
}
