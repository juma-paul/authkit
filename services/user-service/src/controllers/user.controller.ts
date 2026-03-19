import { Request, Response, NextFunction } from "express";

import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import { NotFoundError } from "../errors/AppError";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get userId from req.user
    const userId = req.user?.userId;
    if (!userId) {
      throw new NotFoundError("User not found");
    }

    //Query database for user
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    // Return user without sensitive fields
    const {
      password_hash,
      deleted_at,
      restore_token,
      restore_token_expires_at,
      ...safeUser
    } = user.rows[0];

    sendSuccess(res, { user: safeUser });
  } catch (error) {
    next(error);
  }
};
