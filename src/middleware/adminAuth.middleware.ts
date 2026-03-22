import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";
import { UnauthorizedError } from "../errors/AppError";

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminSecret = req.header("X-Admin-Secret");
  if (!adminSecret || adminSecret !== config.adminSecret) {
    return next(new UnauthorizedError("Invalid admin secret"));
  }
  next();
};
