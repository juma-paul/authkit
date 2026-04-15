/**
 * Error Messages Constants
 *
 * Centralized error messages to ensure consistency across the codebase.
 * These messages are used in controllers and match frontend expectations.
 */

export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in",
  ACCOUNT_DELETED: "This account has been deleted",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  INVALID_TOKEN: "Invalid or expired token",
  TOKEN_EXPIRED: "Token has expired",

  // Authorization
  UNAUTHORIZED: "You are not authorized to perform this action",
  FORBIDDEN: "Access denied",
  LOCAL_ACCOUNT_ONLY: "This action is only available for local accounts",
  OAUTH_ACCOUNT_ONLY: "This action is only available for OAuth accounts",

  // Validation
  INVALID_EMAIL: "Please provide a valid email address",
  INVALID_PASSWORD: "Invalid password",
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match",
  WEAK_PASSWORD: "Password must be at least 8 characters",
  TERMS_REQUIRED: "You must accept the terms and conditions",
  MISSING_REQUIRED_FIELD: "Missing required field",

  // Conflicts
  EMAIL_ALREADY_EXISTS: "An account with this email already exists",
  EMAIL_ALREADY_REGISTERED: "This email is already registered",
  ACCOUNT_ALREADY_DELETED: "This account has already been deleted",
  OAUTH_CONFLICT_LOCAL:
    "An account with this email already exists using password login. Please sign in using email and password.",

  // 2FA
  INVALID_2FA_CODE: "Invalid verification code",
  TWO_FA_NOT_ENABLED: "Two-factor authentication is not enabled",
  TWO_FA_ALREADY_ENABLED: "Two-factor authentication is already enabled",

  // Password Reset
  RESET_LINK_SENT:
    "If an account exists with this email, a reset link has been sent",
  PASSWORD_RESET_SUCCESS: "Password reset successfully",
  RESET_TOKEN_EXPIRED: "Reset token has expired",
  RESET_TOKEN_USED: "This reset link has already been used",

  // Email Verification
  VERIFICATION_SENT: "Verification email sent",
  ALREADY_VERIFIED: "Email already verified",
  EMAIL_VERIFIED: "Email verified successfully",
  VERIFICATION_TOKEN_EXPIRED: "Verification token has expired",
  VERIFICATION_TOKEN_USED: "This verification link has already been used",

  // Account
  PASSWORD_CHANGED: "Password changed successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  ACCOUNT_DELETED_MESSAGE:
    "Your account has been scheduled for deletion. You have 30 days to restore it.",
  ACCOUNT_RESTORED: "Account restored successfully",
  LOGOUT_SUCCESS: "Logged out successfully",

  // OAuth
  OAUTH_PROVIDER_INVALID: "Invalid OAuth provider",
  OAUTH_STATE_INVALID: "Invalid state token",

  // Generic
  NOT_FOUND: "Resource not found",
  INTERNAL_ERROR: "An unexpected error occurred",
  RATE_LIMITED: "Too many requests. Please try again later.",
  BAD_REQUEST: "Invalid request",
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
