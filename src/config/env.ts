import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
  quiet: true,
});

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_SECRET",
  "JWT_REFRESH_EXPIRES_IN",
  "RESEND_API_KEY",
  "APP_URL",
  "API_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL",
  "ADMIN_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RESEND_FROM_EMAIL",
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const config = {
  port: process.env.PORT || "3001",
  nodeEnv: process.env.NODE_ENV || "development",
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN! as jwt.SignOptions["expiresIn"],
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtRefreshExpiresIn: process.env
    .JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  resendApiKey: process.env.RESEND_API_KEY!,
  resendFromEmail: process.env.RESEND_FROM_EMAIL!,
  appUrl: process.env.APP_URL!,
  apiUrl: process.env.API_URL!,
  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL!,
  githubClientId: process.env.GITHUB_CLIENT_ID!,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET!,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL!,
  adminSecret: process.env.ADMIN_SECRET!,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY!,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET!,
};
