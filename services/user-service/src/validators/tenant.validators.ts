import { z } from "zod";

// Tenant schema
export const tenantSchema = z.object({
  name: z.string().min(2).max(100),
  ownerEmail: z.email(),
});
