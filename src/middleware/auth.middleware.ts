import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import { config } from "../config/env";
import { UnauthorizedError } from "../errors/AppError";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(new UnauthorizedError("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded as { userId: string; email: string };
    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

