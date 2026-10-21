import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Enter a valid email address" })
  .max(100, { message: "Email is too long" });

const otpSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, { message: "Enter the 6-digit verification code" });

export const adminForgotPasswordSchema = z.object({
  email: emailSchema,
});

export const adminVerifyOtpSchema = z.object({
  email: emailSchema,
  code: otpSchema,
});

export const adminResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72, { message: "Password must be at most 72 characters" }),
});

export const adminChangeEmailSendSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1, { message: "Enter your current password" }),
});

export const adminChangeEmailVerifySchema = z.object({
  newEmail: emailSchema,
  code: otpSchema,
});
