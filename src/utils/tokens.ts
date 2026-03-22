import jwt from "jsonwebtoken";
import crypto from "crypto";

import { config } from "../config/env";

export const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign({ userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  const refreshToken = jwt.sign({ userId, email }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const generateOAuthState = (tenantId: string): string => {
  return jwt.sign({ tenantId }, config.jwtSecret, { expiresIn: "10m" });
};

export const verifyOAuthState = (state: string): { tenantId: string } => {
  return jwt.verify(state, config.jwtSecret) as { tenantId: string };
};

