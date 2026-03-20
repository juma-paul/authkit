import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";

import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors/AppError";
import { changeEmailSchema, updateProfileSchema } from "../validators/user.validators";
import { changePasswordSchema } from "../validators/auth.validators";

// Get profile controller
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

// Update profile controller
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

// Change password controller
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body,
    );

    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND tenant_id = $2",
      [userId, req.tenantId],
    );

    if (!result.rows[0]) throw new NotFoundError("User not found");
    const user = result.rows[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );
    if (!passwordMatch)
      throw new UnauthorizedError("Current password is incorrect");

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3",
      [newPasswordHash, userId, req.tenantId],
    );

    // Revoke all refresh tokens
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId],
    );

    sendSuccess(res, { message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// Change email controller
export const changeEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { newEmail, password } = changeEmailSchema.parse(req.body);

    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND tenant_id = $2",
      [userId, req.tenantId],
    );
    if (!result.rows[0]) throw new NotFoundError("User not found");
    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedError("Invalid password");

    // Check new email not already taken in this tenant
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND id != $3",
      [newEmail, req.tenantId, userId],
    );
    if (existingUser.rows.length > 0)
      throw new ConflictError("Email already in use");

    // Update email + mark unverified
    await pool.query(
      `UPDATE users SET email = $1, email_verified = false WHERE id = $2 AND tenant_id = $3`,
      [newEmail, userId, req.tenantId],
    );

    // Revoke all refresh tokens
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId],
    );

    sendSuccess(res, {
      message: "Email changed successfully. Please verify your new email.",
    });
  } catch (error) {
    next(error);
  }
};

