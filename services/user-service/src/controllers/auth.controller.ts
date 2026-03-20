import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { Response, Request, NextFunction } from "express";
import { pool } from "../config/database";
import {
  AccountDeletedError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../errors/AppError";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
} from "../validators/auth.validators";
import { sendSuccess } from "../utils/response";
import { generateTokens } from "../utils/tokens";
import { config } from "../config/env";

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
    // Return response
    const {
      password_hash,
      deleted_at,
      restore_token,
      restore_token_expires_at,
      ...safeUser
    } = user;

    sendSuccess(res, { user: safeUser, accessToken, refreshToken }, 201);
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

    sendSuccess(res, { user: safeUser, accessToken, refreshToken });
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
    const { refreshToken } = logoutSchema.parse(req.body);

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token = $1 AND revoked_at IS NULL`,
      [refreshToken],
    );

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
    const { refreshToken } = refreshTokenSchema.parse(req.body);

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

    sendSuccess(res, { accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};
