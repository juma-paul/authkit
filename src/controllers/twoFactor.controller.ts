import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { Request, Response, NextFunction } from "express";

import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "../errors/AppError";
import { setTokenCookies } from "../utils/cookies";

// Setup 2FA
export const setup2FA = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not uthenticated");

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `BudgetApp (${req.user?.email})`,
    });

    // Save secret to DB
    await pool.query(
      `INSERT INTO two_factor_auth (user_id, secret, enabled)
        VALUES ($1, $2, false)
        ON CONFLICT (user_id) DO UPDATE SET secret = $2, enabled = false`,
      [userId, secret.base32],
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    sendSuccess(res, { qrCode, secret: secret.base32 });
  } catch (error) {
    next(error);
  }
};

// Verify 2FA
export const verify2FA = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    const { code } = req.body;
    if (!code) throw new ValidationError("Code is required");

    // Get secret from DB
    const result = await pool.query(
      "SELECT * FROM two_factor_auth WHERE user_id = $1",
      [userId],
    );
    if (!result.rows[0]) throw new NotFoundError("2FA not setup");

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: result.rows[0].secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!isValid) throw new UnauthorizedError("Invalid 2FA code");

    // Enable 2FA
    await pool.query(
      "UPDATE two_factor_auth SET enabled = true WHERE user_id = $1",
      [userId],
    );

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex"),
    );

    // Save backup codes
    await pool.query(
      "UPDATE two_factor_auth SET backup_codes = $1 WHERE user_id = $2",
      [backupCodes, userId],
    );

    sendSuccess(res, { message: "2FA enabled successfully", backupCodes });
  } catch (error) {
    next(error);
  }
};

// Disable 2FA
export const disable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    const { code } = req.body;
    if (!code) throw new ValidationError("Code is required");

    // Get secret
    const result = await pool.query(
      "SELECT * FROM two_factor_auth WHERE user_id = $1 AND enabled = true",
      [userId],
    );
    if (!result.rows[0]) throw new NotFoundError("2FA not enabled");

    // Verify code before disabling
    const isValid = speakeasy.totp.verify({
      secret: result.rows[0].secret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    if (!isValid) throw new UnauthorizedError("Invalid 2FA code");

    // Disable
    await pool.query(
      "UPDATE two_factor_auth SET enabled = false WHERE user_id = $1",
      [userId],
    );

    sendSuccess(res, { message: "2FA disabled successfully" });
  } catch (error) {
    next(error);
  }
};

// Validate 2FA
export const validate2FA = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code)
      throw new ValidationError("userId and code are required");

    const result = await pool.query(
      "SELECT * FROM two_factor_auth WHERE user_id = $1 AND enabled = true",
      [userId],
    );
    if (!result.rows[0]) throw new UnauthorizedError("2FA not enabled");

    const isValid = speakeasy.totp.verify({
      secret: result.rows[0].secret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    if (!isValid) throw new UnauthorizedError("Invalid 2FA code");

    // Get user and generate tokens
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = userResult.rows[0];

    const { generateTokens } = await import("../utils/tokens");
    const { accessToken, refreshToken } = generateTokens(user.id, user.email);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, refreshToken],
    );

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      userId,
    ]);

    setTokenCookies(res, accessToken, refreshToken);
    sendSuccess(res, { message: "2FA validated successfully" });
  } catch (error) {
    next(error);
  }
};
