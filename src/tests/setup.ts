import { pool } from "../config/database";
import { createTestTenant } from "./helpers/testHelpers";

beforeAll(async () => {
  await createTestTenant();
});

afterAll(async () => {
  await pool.end();
});
