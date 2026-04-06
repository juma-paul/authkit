import { pool } from "../config/database";
import { ForbiddenError, NotFoundError } from "../errors/AppError";

export const ensureLocalAccount = async (userId: string): Promise<void> => {
  const result = await pool.query(
    `SELECT auth_provider
     FROM users
     WHERE id = $1`,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.auth_provider !== "local") {
    throw new ForbiddenError(
      "This action is only available for local accounts",
    );
  }
};
