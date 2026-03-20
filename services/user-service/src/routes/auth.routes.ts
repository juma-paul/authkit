import { Router } from "express";
import {
  login,
  logout,
  refreshTokens,
  register,
  resendVerification,
  sendVerification,
  verifyEmail,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshTokens);

router.post("/send-verification", authenticate, sendVerification);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", authenticate, resendVerification);

export default router;
