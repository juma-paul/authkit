import { Router } from "express";
import passport from "../config/passport";
import { oauthCallback } from "../controllers/oauth.controller";
import { getOAuthUrl } from "../controllers/auth.controller";
import { verifyOAuthState } from "../utils/tokens";
import { UnauthorizedError } from "../errors/AppError";

const router = Router();

// Get OAuth URL
router.get("/oauth/url", getOAuthUrl);

// Google OAuth
router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["email", "profile"],
    session: false,
    state: req.query.state as string,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    try {
      const { tenantId } = verifyOAuthState(req.query.state as string);
      (req as any).tenantId = tenantId;
      next();
    } catch {
      next(new UnauthorizedError("Invalid state token"));
    }
  },
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  oauthCallback,
);

// GitHub OAuth
router.get("/github", (req, res, next) => {
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
    state: req.query.state as string,
  })(req, res, next);
});

router.get(
  "/github/callback",
  (req, res, next) => {
    try {
      const { tenantId } = verifyOAuthState(req.query.state as string);
      (req as any).tenantId = tenantId;
      next();
    } catch {
      next(new UnauthorizedError("Invalid state token"));
    }
  },
  passport.authenticate("github", {
    failureRedirect: "/login",
    session: false,
  }),
  oauthCallback,
);

export default router;
