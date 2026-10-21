import type { AdminOtp, AdminOtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendAdminOtpEmail } from "@/lib/email";
import { generateOtp, hashOtp, verifyOtpHash } from "@/lib/otp";

export const ADMIN_OTP_EXPIRY_MINUTES = 10;
export const ADMIN_OTP_MAX_ATTEMPTS = 5;
export const ADMIN_OTP_MAX_RESEND_COUNT = 5;
export const ADMIN_OTP_RESEND_COOLDOWN_SECONDS = 60;

export class AdminOtpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminOtpError";
    this.status = status;
  }
}

interface CreateAdminOtpParams {
  adminId: string;
  email: string;
  purpose: AdminOtpPurpose;
  recipientName?: string | null;
}

/**
 * Creates a fresh one-time code for an admin action and emails it to the
 * requested address. Enforces a resend cooldown and per-code resend limit.
 */
export async function createAndSendAdminOtp({
  adminId,
  email,
  purpose,
  recipientName,
}: CreateAdminOtpParams) {
  const now = new Date();

  const existingOtp = await prisma.adminOtp.findFirst({
    where: { adminId, purpose, email },
    orderBy: { createdAt: "desc" },
  });

  if (existingOtp) {
    if (existingOtp.resendCount >= ADMIN_OTP_MAX_RESEND_COUNT) {
      throw new AdminOtpError(
        "Too many verification codes requested. Please try again later.",
        429,
      );
    }

    const secondsSinceCreated = (now.getTime() - existingOtp.createdAt.getTime()) / 1000;
    if (
      existingOtp.resendCount > 0 &&
      secondsSinceCreated < ADMIN_OTP_RESEND_COOLDOWN_SECONDS
    ) {
      const wait = Math.ceil(ADMIN_OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
      throw new AdminOtpError(
        `Please wait ${wait} second${wait === 1 ? "" : "s"} before requesting a new code.`,
        429,
      );
    }
  }

  // Only one active code per admin action.
  await prisma.adminOtp.deleteMany({ where: { adminId, purpose } });

  const otp = generateOtp();
  const expiresAt = new Date(now.getTime() + ADMIN_OTP_EXPIRY_MINUTES * 60 * 1000);

  const record = await prisma.adminOtp.create({
    data: {
      adminId,
      email,
      purpose,
      otpHash: hashOtp(otp),
      expiresAt,
      resendCount: existingOtp ? existingOtp.resendCount + 1 : 0,
    },
  });

  try {
    await sendAdminOtpEmail({
      to: email,
      otp,
      purpose,
      recipientName,
    });
  } catch (error) {
    await prisma.adminOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    console.error("Failed to send admin verification email:", error);
    throw new AdminOtpError(
      "Could not send the verification email. Please try again.",
      500,
    );
  }

  return record;
}

interface VerifyAdminOtpParams {
  adminId: string;
  email: string;
  purpose: AdminOtpPurpose;
  otp: string;
}

/**
 * Validates a one-time code and returns its record. Failed attempts are
 * counted against the record so brute-force guessing is limited.
 */
export async function verifyAdminOtp({
  adminId,
  email,
  purpose,
  otp,
}: VerifyAdminOtpParams): Promise<AdminOtp> {
  const record = await prisma.adminOtp.findFirst({
    where: { adminId, purpose, email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new AdminOtpError(
      "No verification code found. Please request a new code.",
      400,
    );
  }

  if (record.attempts >= ADMIN_OTP_MAX_ATTEMPTS) {
    await prisma.adminOtp.deleteMany({ where: { adminId, purpose } });
    throw new AdminOtpError(
      "Too many incorrect attempts. Please request a new code.",
      429,
    );
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.adminOtp.deleteMany({ where: { adminId, purpose } });
    throw new AdminOtpError(
      "The verification code has expired. Please request a new code.",
      400,
    );
  }

  if (!verifyOtpHash(otp, record.otpHash)) {
    await prisma.adminOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = ADMIN_OTP_MAX_ATTEMPTS - record.attempts - 1;

    throw new AdminOtpError(
      `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      400,
    );
  }

  await prisma.adminOtp.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return record;
}

/** Removes every outstanding code for one admin action. */
export async function clearAdminOtps(adminId: string, purpose?: AdminOtpPurpose) {
  await prisma.adminOtp.deleteMany({
    where: {
      adminId,
      ...(purpose ? { purpose } : {}),
    },
  });
}
