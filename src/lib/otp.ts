import crypto from "crypto";

export const OTP_EXPIRY_MINUTES = 5;
export const MAX_VERIFY_ATTEMPTS = 10;
export const MAX_RESEND_COUNT = 10;
export const LOCKOUT_MINUTES = 15;
export const RESEND_COOLDOWN_SECONDS = 60;

export function generateOtp(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const computed = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}
