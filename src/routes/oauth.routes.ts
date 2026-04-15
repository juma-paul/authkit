import { Router } from "express";
import passport from "../config/passport";
import { oauthCallback } from "../controllers/oauth.controller";
import { getOAuthUrl } from "../controllers/auth.controller";
import { verifyOAuthState } from "../utils/tokens";
import { ConflictError } from "../errors/AppError";
import { config } from "../config/env";

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

router.get("/google/callback", (req, res, next) => {
  try {
    const { tenantId } = verifyOAuthState(req.query.state as string);
    (req as any).tenantId = tenantId;
  } catch {
    return res.redirect(
      `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent("Invalid state token")}`,
    );
  }

  passport.authenticate(
    "google",
    { session: false },
    (err: any, user: Express.User | false | null) => {
      if (err) {
        if (err instanceof ConflictError) {
          return res.redirect(
            `${config.appUrl}/auth/callback?error=conflict&message=${encodeURIComponent(err.message)}`,
          );
        }

        return next(err);
      }

      if (!user) {
        return res.redirect(
          `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent("Google sign-in failed")}`,
        );
      }

      (req as any).user = user;
      return oauthCallback(req, res, next);
    },
  )(req, res, next);
});

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
      return res.redirect(
        `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent("Invalid state token")}`,
      );
    }
  },
  (req, res, next) => {
    passport.authenticate(
      "github",
      { session: false },
      (err: any, user: Express.User | false | null) => {
        if (err) {
          if (err instanceof ConflictError) {
            return res.redirect(
              `${config.appUrl}/auth/callback?error=conflict&message=${encodeURIComponent(err.message)}`,
            );
          }

          return next(err);
        }

        if (!user) {
          return res.redirect(
            `${config.appUrl}/auth/callback?error=auth_failed&message=${encodeURIComponent("GitHub sign-in failed")}`,
          );
        }

        (req as any).user = user;
        return oauthCallback(req, res, next);
      },
    )(req, res, next);
  },
);

export default router;
