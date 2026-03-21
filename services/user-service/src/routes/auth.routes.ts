import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshTokens,
  register,
  resendVerification,
  resetPassword,
  sendVerification,
  verifyEmail,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Authentication
router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshTokens);

// Email verification
router.post("/send-verification", authenticate, sendVerification);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", authenticate, resendVerification);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
