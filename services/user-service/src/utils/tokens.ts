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
