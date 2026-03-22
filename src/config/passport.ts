import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";

import { config } from "./env";
import { pool } from "./database";

const findOrCreateUser = async (
  tenantId: string,
  email: string,
  provider: string,
  providerId: string,
  name?: string,
  avatarUrl?: string,
) => {
  // Check if user exists
  let result = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND tenant_id = $2",
    [email, tenantId],
  );

  if (result.rows.length === 0) {
    // Create new user
    result = await pool.query(
      `INSERT INTO users 
       (tenant_id, email, email_verified, terms_accepted, terms_accepted_at, first_name, avatar_url)
       VALUES ($1, $2, true, true, NOW(), $3, $4)
       RETURNING *`,
      [tenantId, email, name, avatarUrl],
    );
  }

  const user = result.rows[0];

  // Save OAuth connection
  await pool.query(
    `INSERT INTO oauth_connections (user_id, provider, provider_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider, provider_user_id) DO NOTHING`,
    [user.id, provider, providerId],
  );

  return user;
};

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
        const email = profile.emails?.[0].value!;
        const user = await findOrCreateUser(
          tenantId,
          email,
          "google",
          profile.id,
          profile.displayName,
          profile.photos?.[0].value,
        );
        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: config.githubClientId,
      clientSecret: config.githubClientSecret,
      callbackURL: config.githubCallbackUrl,
      passReqToCallback: true,
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

        // Fetch emails from GitHub API
        const response = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = (await response.json()) as Array<{
          email: string;
          primary: boolean;
        }>;
        const email = emails.find((e) => e.primary)?.email;

        if (!email) return done(new Error("No email provided by GitHub"));
        const user = await findOrCreateUser(
          tenantId,
          email,
          "github",
          profile.id,
          profile.displayName,
          profile.photos?.[0].value,
        );
        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

export default passport;
