import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";

import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../errors/AppError";
import {
  changeEmailSchema,
  updateProfileSchema,
} from "../validators/user.validators";
import { changePasswordSchema } from "../validators/auth.validators";
import { generateSecureToken } from "../utils/tokens";
import { sendEmailChangeVerificationEmail } from "../services/email.service";

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

    // Check new email not already taken
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND id != $3",
      [newEmail, req.tenantId, userId],
    );
    if (existingUser.rows.length > 0)
      throw new ConflictError("Email already in use");

    // Delete any existing pending email change tokens
    await pool.query("DELETE FROM email_change_tokens WHERE user_id = $1", [
      userId,
    ]);

    // Store pending email change token
    const token = generateSecureToken();
    await pool.query(
      `INSERT INTO email_change_tokens (user_id, new_email, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
      [userId, newEmail, token],
    );

    // Send verification email to new address
    await sendEmailChangeVerificationEmail(newEmail, token);

    sendSuccess(res, {
      message: "Please verify your new email address. Check your inbox.",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailChange = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.query as { token: string };

    // Find valid token
    const result = await pool.query(
      `SELECT * FROM email_change_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    if (!result.rows[0])
      throw new UnauthorizedError("Invalid or expired token");

    const { user_id, new_email } = result.rows[0];

    // Mark token as used
    await pool.query(
      "UPDATE email_change_tokens SET used_at = NOW() WHERE token = $1",
      [token],
    );

    // Now update the email
    await pool.query(
      `UPDATE users SET email = $1, email_verified = true, updated_at = NOW()
       WHERE id = $2`,
      [new_email, user_id],
    );

    // Revoke all refresh tokens
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [user_id],
    );

    sendSuccess(res, {
      message: "Email changed successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
};


// Delete account controller
export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { password } = req.body;
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError("Not authenticated");

    // Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND tenant_id = $2",
      [userId, req.tenantId],
    );
    if (!result.rows[0]) throw new NotFoundError("User not found");
    const user = result.rows[0];

    // Check not already deleted
    if (user.deleted_at) throw new ConflictError("Account already deleted");

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedError("Invalid password");

    // Generate restore token
    const restoreToken = generateSecureToken();
    const restoreTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Soft delete
    await pool.query(
      `UPDATE users SET 
        deleted_at = NOW(),
        restore_token = $1,
        restore_token_expires_at = $2
       WHERE id = $3`,
      [restoreToken, restoreTokenExpiry, userId],
    );

    // Revoke all refresh tokens
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId],
    );

    sendSuccess(res, {
      message: "Account deleted. You have 30 days to restore it.",
    });
  } catch (error) {
    next(error);
  }
};

// Restore account controller
export const restoreAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token } = req.body;
    if (!token) throw new ValidationError("Restore token is required");

    // Find user with valid restore token
    const result = await pool.query(
      `SELECT * FROM users 
       WHERE restore_token = $1 
       AND restore_token_expires_at > NOW()
       AND deleted_at IS NOT NULL`,
      [token],
    );
    if (!result.rows[0])
      throw new UnauthorizedError("Invalid or expired restore token");

    // Restore account
    await pool.query(
      `UPDATE users SET 
        deleted_at = NULL,
        restore_token = NULL,
        restore_token_expires_at = NULL
       WHERE id = $1`,
      [result.rows[0].id],
    );

    sendSuccess(res, { message: "Account restored successfully" });
  } catch (error) {
    next(error);
  }
};
