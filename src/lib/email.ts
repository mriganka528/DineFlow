import nodemailer from "nodemailer";
import type { AdminOtpPurpose } from "@prisma/client";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface OtpEmailParams {
  to: string;
  otp: string;
  restaurantName: string;
  logoUrl?: string | null;
  supportEmail?: string | null;
  phone?: string | null;
}

const OTP_EXPIRY_MINUTES = 5;

export async function sendOtpEmail({
  to,
  otp,
  restaurantName,
  logoUrl,
  supportEmail,
  phone,
}: OtpEmailParams) {
  const senderName = restaurantName;
  const from = `${senderName} <${process.env.EMAIL_USER}>`;
  const subject = `Your verification code for ${restaurantName}`;

  const html = buildOtpHtml({ otp, restaurantName, logoUrl, supportEmail, phone });
  const text = buildOtpText({ otp, restaurantName, supportEmail, phone });

  const headers: Record<string, string> = {};
  if (supportEmail) {
    headers["Reply-To"] = supportEmail;
  }

  await transporter.verify();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      headers,
    });
    console.log("OTP email sent:", { to, messageId: info.messageId });
  } catch (error) {
    console.error("Nodemailer error:", { to, error });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

interface AdminOtpEmailParams {
  to: string;
  otp: string;
  purpose: AdminOtpPurpose;
  recipientName?: string | null;
}

const ADMIN_OTP_EXPIRY_MINUTES = 10;

export async function sendAdminOtpEmail({
  to,
  otp,
  purpose,
  recipientName,
}: AdminOtpEmailParams) {
  const greeting = recipientName ? `Hi ${esc(recipientName)},` : "Hello,";
  const content =
    purpose === "PASSWORD_RESET"
      ? {
          title: "Reset your admin password",
          intro:
            "We received a request to reset the password for your DineFlow admin account. Use the code below to continue.",
          subject: "Reset your DineFlow admin password",
          warning:
            "If you did not request a password reset, you can safely ignore this email. Your password has not been changed.",
          actionLabel: "PASSWORD RESET",
        }
      : purpose === "EMAIL_CHANGE"
        ? {
            title: "Confirm your new email",
            intro:
              "We received a request to change the email address on your DineFlow admin account. Use the code below to confirm the new address.",
            subject: "Confirm your new DineFlow admin email",
            warning:
              "If you did not request this change, you can safely ignore this email. Your admin email will stay the same.",
            actionLabel: "EMAIL CHANGE",
          }
        : {
            title: "Verify your admin sign-in",
            intro:
              "A sign-in attempt for your DineFlow admin account needs verification. Use the code below to finish signing in.",
            subject: "Your DineFlow admin sign-in code",
            warning:
              "If you did not try to sign in, someone may know your password. Do not share this code, and reset your password immediately.",
            actionLabel: "SIGN-IN VERIFICATION",
          };
  const { title, intro, subject, warning, actionLabel } = content;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1eb;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(23,20,18,0.12);">
        <tr>
          <td style="background-color:#171412;padding:28px 32px;text-align:center;">
            <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:12px;background-color:#d9462b;font-size:22px;">&#127860;</div>
            <p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">DineFlow Admin</p>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 32px 30px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#b93a24;text-transform:uppercase;letter-spacing:1px;">${actionLabel}</p>
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#171412;">${title}</h1>
            <p style="margin:0 0 8px;font-size:15px;color:#57534e;line-height:1.6;">${greeting}</p>
            <p style="margin:0 0 26px;font-size:15px;color:#57534e;line-height:1.6;">${intro}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background-color:#fff7ed;border:2px solid #fed7aa;border-radius:12px;padding:20px 34px;">
                    <span style="font-size:34px;font-weight:800;letter-spacing:12px;color:#9a3412;font-family:'Courier New',Courier,monospace;">${otp}</span>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#92400e;text-align:center;">This code expires in <strong>${ADMIN_OTP_EXPIRY_MINUTES} minutes</strong>.</p>
            <div style="margin-top:24px;padding:14px 16px;background-color:#f5f5f4;border-radius:10px;border:1px solid #e7e5e4;">
              <p style="margin:0;font-size:13px;color:#57534e;line-height:1.6;">&#128274;&nbsp; ${warning}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background-color:#faf8f4;border-top:1px solid #ede6db;">
            <p style="margin:0;font-size:11px;color:#8a7c6e;text-align:center;line-height:1.6;">Never share this code with anyone. DineFlow will never ask for it by phone or chat.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    "DineFlow Admin",
    "",
    title,
    "",
    greeting,
    intro,
    "",
    `  ${otp}`,
    "",
    `This code expires in ${ADMIN_OTP_EXPIRY_MINUTES} minutes.`,
    warning,
    "",
    "Never share this code with anyone. DineFlow will never ask for it by phone or chat.",
  ].join("\n");

  const from = `DineFlow Admin <${process.env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    console.log("Admin OTP email sent:", { to, purpose, messageId: info.messageId });
  } catch (error) {
    console.error("Nodemailer error (admin OTP):", { to, purpose, error });
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOtpHtml({
  otp,
  restaurantName,
  logoUrl,
  supportEmail,
  phone,
}: Omit<OtpEmailParams, "to">) {
  const name = esc(restaurantName);

  const logoBlock = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${name}" width="56" height="56" style="display:block;margin:0 auto 14px;border-radius:14px;border:2px solid rgba(255,255,255,0.3);" />`
    : `<div style="width:56px;height:56px;margin:0 auto 14px;border-radius:14px;background-color:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;line-height:1;">&#127860;</span>
      </div>`;

  const contactLines: string[] = [];
  if (supportEmail) contactLines.push(`<a href="mailto:${esc(supportEmail)}" style="color:#c2410c;text-decoration:none;font-weight:500;">${esc(supportEmail)}</a>`);
  if (phone) contactLines.push(`<a href="tel:${esc(phone)}" style="color:#c2410c;text-decoration:none;font-weight:500;">${esc(phone)}</a>`);

  const contactBlock = contactLines.length > 0
    ? `<tr>
        <td style="padding:20px 32px;background-color:#fff7ed;border-top:1px solid #fed7aa;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.6px;">Need help?</p>
          <p style="margin:0;font-size:13px;color:#431407;line-height:1.7;">${contactLines.join(" &nbsp;&middot;&nbsp; ")}</p>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#fdf6f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf6f0;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(154,52,18,0.08);">

        <!-- Header with warm gradient -->
        <tr>
          <td style="background:linear-gradient(135deg,#ea580c 0%,#f59e0b 100%);padding:36px 32px 28px;text-align:center;">
            ${logoBlock}
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">${name}</h1>
          </td>
        </tr>

        <!-- Decorative divider -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#ea580c,#f59e0b,#ea580c);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 32px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#9a3412;text-transform:uppercase;letter-spacing:0.5px;">Verification Code</p>
            <p style="margin:0 0 28px;font-size:15px;color:#57534e;line-height:1.6;">Use the code below to verify your account. Do not share it with anyone.</p>

            <!-- OTP Box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background:linear-gradient(145deg,#fff7ed,#fffbeb);border:2px solid #fed7aa;border-radius:12px;padding:22px 36px;">
                    <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#9a3412;font-family:'Courier New',Courier,monospace;">${otp}</span>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Expiry + Security -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td style="padding:14px 16px;background-color:#fef3c7;border-radius:10px;border:1px solid #fde68a;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                    &#9200;&nbsp; This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
                  </p>
                </td>
              </tr>
              <tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
              <tr>
                <td style="padding:14px 16px;background-color:#f5f5f4;border-radius:10px;border:1px solid #e7e5e4;">
                  <p style="margin:0;font-size:13px;color:#57534e;line-height:1.5;">
                    &#128274;&nbsp; If you did not request this code, no action is needed.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Contact -->
        ${contactBlock}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background-color:#1c1917;">
            <p style="margin:0 0 6px;font-size:11px;color:#a8a29e;text-align:center;line-height:1.6;">
              Never share this code with anyone. ${name} will never ask for it by phone or chat.
            </p>
            <p style="margin:0;font-size:11px;color:#78716c;text-align:center;">
              &copy; ${new Date().getFullYear()} ${name} &nbsp;&#127860;&nbsp; All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildOtpText({
  otp,
  restaurantName,
  supportEmail,
  phone,
}: Pick<OtpEmailParams, "otp" | "restaurantName" | "supportEmail" | "phone">) {
  const lines = [
    restaurantName,
    "",
    "Your verification code:",
    "",
    `  ${otp}`,
    "",
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    "If you did not request this code, no action is needed.",
    "",
  ];

  if (supportEmail || phone) {
    lines.push("Need help?");
    if (supportEmail) lines.push(`  Email: ${supportEmail}`);
    if (phone) lines.push(`  Phone: ${phone}`);
    lines.push("");
  }

  lines.push(
    `Never share this code. ${restaurantName} will never ask for it by phone or chat.`,
  );

  return lines.join("\n");
}
