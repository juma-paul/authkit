import bcrypt from "bcrypt";

import { Response, Request, NextFunction } from "express";
import { pool } from "../config/database";
import { ConflictError } from "../errors/AppError";
import { registerSchema } from "../validators/auth.validators";
import { sendSuccess } from "../utils/response";
import { generateTokens } from "../utils/tokens";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);

    // Check email doesn't exist
    const existingUser = await pool.query(
      "SELECT id from users WHERE email = $1",
      [validatedData.email],
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Save to database
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, terms_accepted, terms_accepted_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, email, terms_accepted, created_at`,
      [validatedData.email, passwordHash, validatedData.termsAccepted],
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
    sendSuccess(res, { user, accessToken, refreshToken }, 201);
  } catch (error) {
    next(error);
  }
};
