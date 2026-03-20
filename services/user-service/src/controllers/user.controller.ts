import { Request, Response, NextFunction } from "express";

import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import { NotFoundError, UnauthorizedError } from "../errors/AppError";
import { updateProfileSchema } from "../validators/auth.validators";

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
    const user = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND tenant_id = $2",
      [userId, req.tenantId],
    );
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

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Not authenticated");
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`,
      [
        validatedData.first_name,
        validatedData.last_name,
        validatedData.avatar_url,
        userId,
        req.tenantId,
      ],
    );

    if (!result.rows[0]) {
      throw new NotFoundError("User not found");
    }

    const {
      password_hash,
      deleted_at,
      restore_token,
      restore_token_expires_at,
      ...safeUser
    } = result.rows[0];

    sendSuccess(res, { user: safeUser });
  } catch (error) {
    next(error);
  }
};
