import { Router } from "express";
import {
  login,
  logout,
  refreshTokens,
  register,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshTokens);

export default router;
