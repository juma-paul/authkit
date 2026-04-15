import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

import { config } from "./env";
import { pool } from "./database";
import { ConflictError } from "../errors/AppError";

/**
 * Production-safe OAuth user handler
 */
const findOrCreateUser = async (
  tenantId: string,
  email: string,
  provider: string,
  providerId: string,
  name?: string,
  avatarUrl?: string,
) => {
  // Check existing user
  const existingResult = await pool.query(
    `SELECT * 
     FROM users 
     WHERE email = $1 
     AND tenant_id = $2`,
    [email, tenantId],
  );

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];

    /**
     * LOCAL account exists
     */
    if (existing.auth_provider === "local") {
      throw new ConflictError(
        "An account with this email already exists using password login. Please sign in using email and password.",
      );
    }

    /**
     * Different OAuth provider exists
     */
    if (existing.auth_provider !== provider) {
      throw new ConflictError(
        `This email is already connected to ${existing.auth_provider}. Please sign in using ${existing.auth_provider}.`,
      );
    }

    /**
     * SAME provider — LOGIN EXISTING USER
     */
    await pool.query(
      `INSERT INTO oauth_connections
       (user_id, provider, provider_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, provider_user_id) DO NOTHING`,
      [existing.id, provider, providerId],
    );

    return existing;
  }

  /**
   * CREATE NEW USER
   */
  const result = await pool.query(
    `INSERT INTO users 
     (
       tenant_id,
       email,
       email_verified,
       terms_accepted,
       terms_accepted_at,
       first_name,
       avatar_url,
       auth_provider
     )
     VALUES ($1,$2,true,true,NOW(),$3,$4,$5)
     RETURNING *`,
    [tenantId, email, name, avatarUrl, provider],
  );

  const user = result.rows[0];

  await pool.query(
    `INSERT INTO oauth_connections
     (user_id, provider, provider_user_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (provider, provider_user_id) DO NOTHING`,
    [user.id, provider, providerId],
  );

  return user;
};


// GOOGLE

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const tenantId = (req as any).tenantId;

        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email provided by Google"));
        }

        const user = await findOrCreateUser(
          tenantId,
          email,
          "google",
          profile.id,
          profile.displayName,
          profile.photos?.[0]?.value,
        );

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    },
  ),
);

/* =========================
   GITHUB
========================= */

passport.use(
  new GitHubStrategy(
    {
      clientID: config.githubClientId,
      clientSecret: config.githubClientSecret,
      callbackURL: config.githubCallbackUrl,
      passReqToCallback: true,
      scope: ["user:email"],
    },
    async (
      req: any,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: any,
    ) => {
      try {
        const tenantId = req.tenantId;

        /**
         * Fetch GitHub emails
         */
        const response = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch GitHub emails");
        }

        const emails = (await response.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;

        const primaryEmail =
          emails.find((e) => e.primary && e.verified) ||
          emails.find((e) => e.primary);

        if (!primaryEmail?.email) {
          return done(new Error("No verified email available from GitHub"));
        }

        const user = await findOrCreateUser(
          tenantId,
          primaryEmail.email,
          "github",
          profile.id,
          profile.displayName,
          profile.photos?.[0]?.value,
        );

        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

export default passport;
