import { Router } from "express";
import { registerTenant } from "../controllers/tenant.controller";
import { adminAuth } from "../middleware/adminAuth.middleware";

const router = Router();

router.post("/", adminAuth, registerTenant);

export default router;