import { Response } from "express";
import { AppError } from "../errors/AppError";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): void => {
  res.status(statusCode).json({
    success: true,
    statusCode: statusCode,
    data: data,
  });
};

export const sendError = (
  res: Response,
  error: AppError
): void => {
  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code,
      message: error.message,
    },
  });
};
