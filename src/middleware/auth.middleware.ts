import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import { config } from "../config/env";
import { TokenExpiredError, UnauthorizedError } from "../errors/AppError";

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
    req.user = decoded as {
      userId: string;
      email: string;
      auth_provider: string;
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new TokenExpiredError());
    }
    next(new UnauthorizedError("Invalid token"));
  }
};
