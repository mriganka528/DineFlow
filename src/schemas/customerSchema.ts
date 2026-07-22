import { z } from "zod";

export const customerAuthSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name is too long" }),

  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(100, { message: "Email is too long" }),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, { message: "Enter a valid phone number" }),
});

export const customerLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(100, { message: "Email is too long" }),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, { message: "Enter a valid phone number" }),
});

export const customerSignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name is too long" }),

  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" })
    .max(100, { message: "Email is too long" }),

  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, { message: "Enter a valid phone number" }),
});

export const otpVerifySchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" }),

  otp: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, { message: "Enter a valid 6-digit OTP" }),
});

export const resendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email address" }),
});
