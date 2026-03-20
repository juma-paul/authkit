import { z } from "zod";

// User registrationn schema
export const registerSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain atleast one number"),
    confirmPassword: z.string(),
    termsAccepted: z.literal(true, {
      error: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// User login schema
export const loginSchema = z.object({
  email: z.email("Invalid email or password"),
  password: z.string(),
});

// User logout schema
export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*[0-9])/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });