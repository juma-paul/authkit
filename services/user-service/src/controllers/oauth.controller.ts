import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { generateTokens } from "../utils/tokens";
import { setTokenCookies } from "../utils/cookies";

export const oauthCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user as any;

    // Generate our JWT tokens
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

    setTokenCookies(res, accessToken, refreshToken);
  } catch (error) {
    next(error);
  }
};
