import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { generateTokens } from "../utils/tokens";
import { setTokenCookies } from "../utils/cookies";
import { config } from "../config/env";

export const oauthCallback = async (
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (!req.user) {
    return res.redirect(
      `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent("Authentication failed")}`,
    );
  }

  try {
    const oauthUser = req.user as any;

    const { accessToken, refreshToken } = generateTokens(
      oauthUser.id,
      oauthUser.email,
      oauthUser.auth_provider,
    );

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [oauthUser.id, refreshToken],
    );

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      oauthUser.id,
    ]);

    setTokenCookies(res, accessToken, refreshToken);

    return res.redirect(`${config.appUrl}/auth/callback?success=true`);
  } catch (error: any) {
    const message = error?.message || "Authentication failed";

    return res.redirect(
      `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent(message)}`,
    );
  }
};
