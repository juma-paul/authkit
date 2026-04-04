import { Router } from "express";

import {
  changeEmail,
  changePassword,
  deleteAccount,
  getProfile,
  restoreAccount,
  updateProfile,
  verifyEmailChange,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  setup2FA,
  verify2FA,
  disable2FA,
} from "../controllers/twoFactor.controller";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.put("/change-password", authenticate, changePassword);
router.put("/change-email", authenticate, changeEmail);
router.get("/verify-email-change", verifyEmailChange);


// 2FA
router.post("/2fa/setup", authenticate, setup2FA);
router.post("/2fa/verify", authenticate, verify2FA);
router.post("/2fa/disable", authenticate, disable2FA);

router.delete("/account", authenticate, deleteAccount);
router.post("/account/restore", restoreAccount);

export default router;
