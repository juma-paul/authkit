import { Resend } from "resend";
import { config } from "../config/env";

const resend = new Resend(config.resendApiKey);

const FROM_EMAIL = "onboarding@resend.dev";
const APP_NAME = "BudgetApp";

export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Verify your ${APP_NAME} email`,
    html: `
      <h2>Welcome to ${APP_NAME}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};

export const sendEmailChangeNotification = async (
  oldEmail: string,
  newEmail: string,
): Promise<void> => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: oldEmail,
    subject: `Your ${APP_NAME} email was changed`,
    html: `
      <h2>Email Change Notification</h2>
      <p>Your email was changed to <strong>${newEmail}</strong>.</p>
      <p>If you didn't do this, contact support immediately.</p>
    `,
  });
};

export const sendEmailChangeVerificationEmail = async (
  newEmail: string,
  token: string,
): Promise<void> => {
  const verificationUrl = `${config.appUrl}/verify-email-change?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: newEmail,
    subject: `Verify your new ${APP_NAME} email`,
    html: `
      <h2>Confirm your new email</h2>
      <p>Click the link below to confirm your new email address:</p>
      <a href="${verificationUrl}">Verify New Email</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};

export const sendAccountDeletionEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const restoreUrl = `${config.appUrl}/restore-account?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your ${APP_NAME} account has been deleted`,
    html: `
      <h2>Account Deleted</h2>
      <p>Your account has been deleted. You have 30 days to restore it.</p>
      <a href="${restoreUrl}">Restore My Account</a>
      <p>If you didn't request this, please restore your account immediately.</p>
    `,
  });
};


