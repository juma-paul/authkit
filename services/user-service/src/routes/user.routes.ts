import { Router } from "express";

import {
  changeEmail,
  changePassword,
  getProfile,
  updateProfile,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.put("/change-password", authenticate, changePassword);
router.put("/change-email", authenticate, changeEmail);

export default router;
