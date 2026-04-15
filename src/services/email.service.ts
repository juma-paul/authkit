import { Resend } from "resend";
import { config } from "../config/env";

const resend = new Resend(config.resendApiKey);

// const FROM_EMAIL = "AuthKit <noreply@alqzaa.com>";
const FROM_EMAIL = `${config.resendFromEmail}`;
const APP_NAME = "AuthKit";

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                This email was sent by ${APP_NAME}. If you didn't request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const primaryButton = (url: string, text: string) => `
  <a href="${url}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.2px;">
    ${text}
  </a>
`;

const linkNote = (url: string) => `
  <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;">
    Or copy this link: <span style="color:#71717a;">${url}</span>
  </p>
`;

export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<void> => {
  const verificationUrl = `${config.appUrl}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Verify your email — ${APP_NAME}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Confirm your email</h2>
      <p style="margin:0 0 4px;color:#71717a;font-size:15px;line-height:1.6;">Welcome to ${APP_NAME}! Just one step to get started.</p>
      <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6;">Click the button below to verify your email address.</p>
      ${primaryButton(verificationUrl, "Verify Email Address")}
      <p style="margin:0;color:#a1a1aa;font-size:13px;">This link expires in <strong>24 hours</strong>.</p>
      ${linkNote(verificationUrl)}
    `),
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
    subject: `Reset your password — ${APP_NAME}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Reset your password</h2>
      <p style="margin:0 0 4px;color:#71717a;font-size:15px;line-height:1.6;">We received a request to reset your ${APP_NAME} password.</p>
      <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6;">Click the button below to choose a new one.</p>
      ${primaryButton(resetUrl, "Reset Password")}
      <p style="margin:0;color:#a1a1aa;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, no action is needed.</p>
      ${linkNote(resetUrl)}
    `),
  });
};

export const sendEmailChangeNotification = async (
  oldEmail: string,
  newEmail: string,
): Promise<void> => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: oldEmail,
    subject: `Your email address was changed — ${APP_NAME}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Email address updated</h2>
      <p style="margin:0 0 16px;color:#71717a;font-size:15px;line-height:1.6;">Your ${APP_NAME} email address has been changed to:</p>
      <p style="margin:0 0 16px;padding:12px 16px;background:#f4f4f5;border-radius:8px;color:#18181b;font-size:15px;font-weight:600;">${newEmail}</p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;">If you didn't make this change, please contact support immediately.</p>
    `),
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
    subject: `Confirm your new email — ${APP_NAME}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Confirm your new email</h2>
      <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6;">Click the button below to confirm this email address for your ${APP_NAME} account.</p>
      ${primaryButton(verificationUrl, "Confirm New Email")}
      <p style="margin:0;color:#a1a1aa;font-size:13px;">This link expires in <strong>1 hour</strong>.</p>
      ${linkNote(verificationUrl)}
    `),
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
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Your account has been deleted</h2>
      <p style="margin:0 0 4px;color:#71717a;font-size:15px;line-height:1.6;">Your ${APP_NAME} account has been scheduled for deletion.</p>
      <p style="margin:0;color:#71717a;font-size:15px;line-height:1.6;">You have <strong>30 days</strong> to restore it before it's permanently removed.</p>
      ${primaryButton(restoreUrl, "Restore My Account")}
      <p style="margin:0;color:#a1a1aa;font-size:13px;">If you intended to delete your account, no action is needed.</p>
      ${linkNote(restoreUrl)}
    `),
  });
};