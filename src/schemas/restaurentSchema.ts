import { z } from "zod";
import { isValidCurrency } from "@/lib/currency";

export const restaurantSettingsSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(3, {
      message: "Restaurant name must contain at least 3 characters",
    })
    .max(100, {
      message: "Restaurant name is too long",
    }),

  tagline: z
    .string()
    .trim()
    .max(150, {
      message: "Tagline is too long",
    })
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().min(10, { message: "Phone number must contain at least 10 digits", }).max(15, { message: "Phone number is invalid", }),
  email: z
    .string()
    .trim()
    .email({
      message: "Invalid email address",
    }),

  address: z
    .string()
    .trim()
    .min(5, {
      message: "Address is required",
    })
    .max(255, {
      message: "Address is too long",
    }),

  currency: z
    .string()
    .trim()
    .min(1, { message: "Currency is required" })
    .refine((code) => isValidCurrency(code), {
      message: "Unsupported currency",
    }),

  gstRate: z
    .number({
      message: "GST rate must be a number",
    })
    .min(0, {
      message: "GST rate cannot be negative",
    })
    .max(100, {
      message: "GST rate cannot exceed 100%",
    }),

  serviceCharge: z
    .number({
      message: "Service charge must be a number",
    })
    .min(0, {
      message: "Service charge cannot be negative",
    })
    .max(100, {
      message: "Service charge cannot exceed 100%",
    }),

  averagePrepTime: z
    .number({
      message: "Average preparation time must be a number",
    })
    .int({
      message: "Preparation time must be a whole number",
    })
    .min(1, {
      message: "Preparation time must be at least 1 minute",
    }),

  orderMode: z.enum([
    "ACCEPTING",
    "PAUSED",
    "CLOSED",
  ]),

  autoAcceptOrders: z.boolean(),

  dineInEnabled: z.boolean(),

  deliveryEnabled: z.boolean(),

  logoUrl: z.string().url().optional().or(z.literal("")),
  logoPublicId: z.string().optional().or(z.literal("")),
});