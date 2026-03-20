import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { config } from "../../config/env";

export const TEST_API_KEY = "sk_test_1234567890abcdef";

// Create test tenant
export const createTestTenant = async (): Promise<string> => {
  await pool.query(
    `INSERT INTO tenants (name, api_key, owner_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (api_key) DO NOTHING`,
    ["TestApp", TEST_API_KEY, "test@testapp.com"],
  );
  const result = await pool.query("SELECT id FROM tenants WHERE api_key = $1", [
    TEST_API_KEY,
  ]);
  return result.rows[0].id;
};

// Creatye test user
export const createTestUser = async (
  tenantId: string,
  options: { emailVerified: boolean; email: string } = {
    emailVerified: true,
    email: "test@example.com",
  },
): Promise<{ id: string; email: string }> => {
  const passwordHash = await bcrypt.hash("Password123", 12);
  const result = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, email_verified, terms_accepted, terms_accepted_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (email) DO UPDATE SET email_verified = $4
     RETURNING id, email`,
    [tenantId, options.email, passwordHash, options.emailVerified],
  );
  return result.rows[0];
};

// Get test tenant id
export const getTestTenantId = async (): Promise<string> => {
  const result = await pool.query("SELECT id FROM tenants WHERE api_key = $1", [
    TEST_API_KEY,
  ]);
  return result.rows[0].id;
};

// Generate test token
export const generateTestToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: "1h" });
};

export const generateTestRefreshToken = (
  userId: string,
  email: string,
): string => {
  return jwt.sign({ userId, email }, config.jwtRefreshSecret, {
    expiresIn: "7d",
  });
};

// Cleanup test data
export const cleanupTestData = async (): Promise<void> => {
  await pool.query("DELETE FROM refresh_tokens WHERE token IS NOT NULL");
  await pool.query("DELETE FROM users WHERE email LIKE $1", ["%example.com"]);
};
