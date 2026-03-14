import { Request, Response, NextFunction } from "express";
import { AppError, InternalError } from "../errors/AppError";
import { sendError } from "../utils/response";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    sendError(res, err);
  } else {
    console.error("Unexpected error:", err);
    sendError(res, new InternalError());
  }
};
