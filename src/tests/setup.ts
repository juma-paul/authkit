import { pool } from "../config/database";
import { createTestTenant } from "./factories/testDataFactory";

beforeAll(async () => {
  await createTestTenant();
});

afterAll(async () => {
  await pool.end();
});
