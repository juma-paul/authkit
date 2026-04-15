import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        userId: string;
        email: string;
        auth_provider: string;
      };
      tenantId?: string;
    }
  }
}

export {};
