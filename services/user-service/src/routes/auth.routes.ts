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
import { validate2FA } from "../controllers/twoFactor.controller";

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

router.post("/2fa/validate", validate2FA);

export default router;
