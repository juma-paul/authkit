import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { Response, Request, NextFunction } from "express";
import { pool } from "../config/database";
import {
  AccountDeletedError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/AppError";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from "../validators/auth.validators";
import { sendSuccess } from "../utils/response";
import {
  generateOAuthState,
  generateSecureToken,
  generateTokens,
} from "../utils/tokens";
import { config } from "../config/env";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/email.service";

import { setTokenCookies, clearTokenCookies } from "../utils/cookies";

// Signup controller
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);

    if (!req.tenantId) {
      throw new UnauthorizedError("No tenant identified");
    }

    // Check email doesn't exist
    const existingUser = await pool.query(
      "SELECT id from users WHERE email = $1 AND tenant_id = $2",
      [validatedData.email, req.tenantId],
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Save to database
    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, terms_accepted, terms_accepted_at)
             VALUES ($1, $2, $3,$4, NOW())
             RETURNING id, email, terms_accepted, created_at`,
      [
        req.tenantId,
        validatedData.email,
        passwordHash,
        validatedData.termsAccepted,
      ],
    );

    const user = result.rows[0];

    // Generate JWT
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    // Save refresh token to database
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken],
    );

    // Generate verification token and send email
    const verificationToken = generateSecureToken();
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
   VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [user.id, verificationToken],
    );

    await sendVerificationEmail(user.email, verificationToken);

    // Return response
    const {
      password_hash,
      deleted_at,
      restore_token,
      restore_token_expires_at,
      ...safeUser
    } = user;

    setTokenCookies(res, accessToken, refreshToken);
    sendSuccess(res, { user: safeUser }, 201);
  } catch (error) {
    next(error);
  }
};

// Login controller
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Find user by email
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND tenant_id = $2",
      [validatedData.email, req.tenantId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const user = result.rows[0];

    // Check account not deleted
    if (user.deleted_at) {
      throw new AccountDeletedError();
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(
      validatedData.password,
      user.password_hash,
    );
    if (!passwordMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check email verified
    if (!user.email_verified) {
      throw new ForbiddenError("Please verify your email before logging in");
    }

    // Check if 2FA enabled
    const twoFA = await pool.query(
      "SELECT * FROM two_factor_auth WHERE user_id = $1 AND enabled = true",
      [user.id],
    );
    if (twoFA.rows.length > 0) {
      return sendSuccess(res, { requires2FA: true, userId: user.id });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    // Save refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken],
    );

    // Update last login
    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      user.id,
    ]);

    // Return response
    const {
      password_hash,
      deleted_at,
      restore_token,
      restore_token_expires_at,
      ...safeUser
    } = user;

    setTokenCookies(res, accessToken, refreshToken);
    sendSuccess(res, { user: safeUser });
  } catch (error) {
    next(error);
  }
};

// Logout controller
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Read refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new ValidationError("No refresh token provided");
    }

    // Revoke token
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token = $1 AND revoked_at IS NULL`,
      [refreshToken],
    );

    // Clear cookies
    clearTokenCookies(res);

    sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// GetRefreshToken controller
export const refreshTokens = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    // Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (error) {
      return next(new UnauthorizedError("Invalid or expired refresh token"));
    }

    // Check token exists in DB and not revoked
    const tokenRecord = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [refreshToken],
    );

    if (tokenRecord.rows.length === 0) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Revoke old refresh token
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1`,
      [refreshToken],
    );

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
      decoded.email,
    );

    // Save new refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [tokenRecord.rows[0].user_id, newRefreshToken],
    );
    setTokenCookies(res, accessToken, newRefreshToken);
    sendSuccess(res, { message: "Tokens refreshed successfully" });
  } catch (error) {
    next(error);
  }
};

// Send verification controller
export const sendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    // Check user exists and is not already verified
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND tenant_id = $2",
      [userId, req.tenantId],
    );
    if (!result.rows[0]) throw new NotFoundError("User not found");
    if (result.rows[0].email_verified) {
      return sendSuccess(res, { message: "Email already verified" });
    }

    // Delete any existing unused tokens
    await pool.query(
      "DELETE FROM email_verification_tokens WHERE user_id = $1",
      [userId],
    );

    // Generate token and save to DB
    const token = generateSecureToken();
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [userId, token],
    );

    // Send email
    await sendVerificationEmail(result.rows[0].email, token);

    sendSuccess(res, { message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

// verify email
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    if (!token) throw new ValidationError("Token is required");

    // Find token in DB
    const result = await pool.query(
      `SELECT * FROM email_verification_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    if (!result.rows[0])
      throw new UnauthorizedError("Invalid or expired token");

    const { user_id } = result.rows[0];

    // Mark token as used
    await pool.query(
      "UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1",
      [token],
    );

    // Mark user as verified
    await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
      user_id,
    ]);

    sendSuccess(res, { message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

// Resend verification token
export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  return sendVerification(req, res, next);
};

// Forgot password controller
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Find user by email + tenant
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND tenant_id = $2",
      [email, req.tenantId],
    );

    // Always send 200 to prevent email enumeration attacks
    if (!result.rows[0]) {
      return sendSuccess(res, {
        message: "If that email exists, a reset link has been sent",
      });
    }

    const user = result.rows[0];

    // Delete any existing reset tokens
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      user.id,
    ]);

    // Generate token + save to DB
    const token = generateSecureToken();
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [user.id, token],
    );

    // Send email
    await sendPasswordResetEmail(email, token);

    sendSuccess(res, {
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password controller
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    // Find valid token
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    if (!result.rows[0])
      throw new UnauthorizedError("Invalid or expired token");

    const { user_id } = result.rows[0];

    // Mark token as used
    await pool.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1",
      [token],
    );

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      user_id,
    ]);

    // Revoke all refresh tokens
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [user_id],
    );

    sendSuccess(res, { message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

// Get oauth url
export const getOAuthUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { provider } = req.query;
    if (!req.tenantId) throw new UnauthorizedError("No tenant identified");

    const state = generateOAuthState(req.tenantId);
    const baseUrl = `${config.appUrl}/api/v1/auth`;

    const urls: Record<string, string> = {
      google: `${baseUrl}/google?state=${state}`,
      github: `${baseUrl}/github?state=${state}`,
    };

    if (!urls[provider as string]) {
      throw new ValidationError("Invalid provider");
    }

    sendSuccess(res, { url: urls[provider as string] });
  } catch (error) {
    next(error);
  }
};
