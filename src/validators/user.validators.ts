import { z } from "zod";

// User update profile schema
export const updateProfileSchema = z.object({
  first_name: z.string().min(2).max(50).optional(),
  last_name: z.string().min(2).max(50).optional(),
  avatar_url: z.url().optional(),
});

export const changeEmailSchema = z.object({
  newEmail: z.email(),
  password: z.string().min(1),
});

