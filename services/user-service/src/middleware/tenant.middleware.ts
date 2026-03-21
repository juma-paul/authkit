import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { UnauthorizedError } from "../errors/AppError";

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Read api key
  const apiKey = req.header("X-API-Key") || (req.query.apiKey as string);

  if (!apiKey) {
    return next(new UnauthorizedError("No API key provided"));
  }

  // Query database for tenant with api key
  const result = await pool.query("SELECT * FROM tenants WHERE api_key = $1", [
    apiKey,
  ]);

  // Check tenant is active
  const tenant = result.rows[0];

  if (!tenant) {
    return next(new UnauthorizedError("Invalid api key"));
  }

  if (!tenant.is_active) {
    return next(new UnauthorizedError("Tenant is suspended"));
  }

  // Attach tenantId to request
  req.tenantId = tenant.id;
  next();
};
