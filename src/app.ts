import express from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import cors from "cors";

import passport from "./config/passport";
import { config } from "./config/env";
import { sendSuccess } from "./utils/response";
import { NotFoundError } from "./errors/AppError";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth.middleware";
import { tenantMiddleware } from "./middleware/tenant.middleware";
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import oauthRouter from "./routes/oauth.routes";
import tenantRouter from "./routes/tenant.routes";

const app = express();

// CORE MIDDLEWARE
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://authkit-demo-six.vercel.app"],
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(passport.initialize());

// RATE LIMITING
if (config.rateLimitEnabled) {
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later",
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many auth attempts, please try again later",
  });

  app.use(globalLimiter);
  app.use("/api/v1/auth", authLimiter);
}

// HEALTH CHECK
app.get("/health", (req, res) => {
  sendSuccess(res, {
    status: "healthy",
    environment: config.nodeEnv,
  });
});

// TEST ROUTES
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

// TENANT MIDDLEWARE
app.use((req, res, next) => {
  if (
    req.path.includes("/auth/google") ||
    req.path.includes("/auth/github") ||
    req.path.startsWith("/api/v1/tenants")
  ) {
    return next();
  }
  tenantMiddleware(req, res, next);
});

// ROUTES
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/auth", oauthRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tenants", tenantRouter);

// ERROR HANDLER
app.use(errorHandler);

export default app;
