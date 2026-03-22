import { Pool } from "pg";
import { config } from "./env";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};
