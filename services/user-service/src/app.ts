import express from "express";

import { errorHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/response";
import { config } from "./config/env";
import authRouter from "./routes/auth.routes";
import { NotFoundError } from "./errors/AppError";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  sendSuccess(res, {
    status: "healthy",
    service: "user-service",
    environment: config.nodeEnv,
  });
});

if (config.nodeEnv === "test") {
  app.get("/test/error/unknown", (req, res, next) => {
    next(new Error("Unknown error"));
  });

  app.get("/test/error/apperror", (req, res, next) => {
    next(new NotFoundError("Test not found"));
  });
}

app.use("/api/v1/auth", authRouter);
app.use(errorHandler);

export default app;
