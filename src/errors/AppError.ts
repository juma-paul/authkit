import { ERROR_MESSAGES } from "../constants/errorMessages";

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
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = ERROR_MESSAGES.EMAIL_ALREADY_EXISTS) {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.BAD_REQUEST) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
    super(message, 403, "FORBIDDEN");
  }
}

export class InternalError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INTERNAL_ERROR) {
    super(message, 500, "INTERNAL_ERROR");
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = ERROR_MESSAGES.TOKEN_EXPIRED) {
    super(message, 401, "TOKEN_EXPIRED");
  }
}

export class AccountDeletedError extends AppError {
  constructor(message: string = ERROR_MESSAGES.ACCOUNT_DELETED) {
    super(message, 403, "ACCOUNT_DELETED");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INVALID_PASSWORD) {
    super(message, 400, "INVALID_PASSWORD");
  }
}

export class Invalid2FACodeError extends AppError {
  constructor(message: string = ERROR_MESSAGES.INVALID_2FA_CODE) {
    super(message, 400, "INVALID_2FA_CODE");
  }
}
