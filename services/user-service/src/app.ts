import express from "express";

import { sendSuccess } from "./utils/response";
import { config } from "./config/env";
import { NotFoundError } from "./errors/AppError";
import passport from "./config/passport";

import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";

import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import oauthRouter from "./routes/oauth.routes";

const app = express();

app.use(express.json());
app.use(passport.initialize());

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

  app.get("/test/protected", authenticate, (req, res) => {
    sendSuccess(res, { user: req.user });
  });
}

// All routes below require tenant
app.use((req, res, next) => {
  if (req.path.includes("/auth/google") || req.path.includes("/auth/github")) {
    return next();
  }
  tenantMiddleware(req, res, next);
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/auth", oauthRouter);

// Error handler
app.use(errorHandler);

export default app;
