import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { sendSuccess } from "../utils/response";
import { ConflictError } from "../errors/AppError";
import { generateSecureToken } from "../utils/tokens";
import { tenantSchema } from "../validators/tenant.validators";

export const registerTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, ownerEmail, appUrl } = tenantSchema.parse(req.body);

    // Check name not already taken
    const existing = await pool.query(
      "SELECT id FROM tenants WHERE name = $1",
      [name],
    );
    if (existing.rows.length > 0)
      throw new ConflictError("Tenant name already taken");

    // Generate API key
    const apiKey = `sk_${generateSecureToken()}`;

    // Save to DB
    const result = await pool.query(
      `INSERT INTO tenants (name, api_key, owner_email, app_url)
       VALUES ($1, $2, $3, $4) RETURNING id, name, api_key, owner_email, app_url`,
      [name, apiKey, ownerEmail, appUrl ?? null],
    );

    sendSuccess(res, { tenant: result.rows[0] }, 201);
  } catch (error) {
    next(error);
  }
};
