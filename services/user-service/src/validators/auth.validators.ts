import { z } from "zod";

// Reusable Validators
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const confirmPasswordSchema = z.string();

export const passwordMatchRefinement = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

// Schemas

// User registration schema
export const registerSchema = z
  .object({
    email: z.email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    termsAccepted: z.literal(true, {
      error: "You must accept the terms and conditions",
    }),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    passwordMatchRefinement,
  );

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
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    passwordMatchRefinement,
  );

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.email(),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    passwordMatchRefinement,
  );