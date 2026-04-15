import { ZodError } from "zod";

import { Request, Response, NextFunction } from "express";
import { AppError, InternalError, ValidationError } from "../errors/AppError";
import { sendError } from "../utils/response";
import { config } from "../config/env";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    const zodError = err as ZodError;
    sendError(res, new ValidationError(zodError.issues[0].message));
  } else if (err instanceof AppError) {
    sendError(res, err);
  } else {
    if (config.nodeEnv !== "test") {
      console.error("Unexpected error:", err);
    }
    sendError(res, new InternalError());
  }
};
