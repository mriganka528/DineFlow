import { z } from "zod";

export const categorySchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, {
            message: "Category name must contain at least 3 characters",
        })
        .max(50, {
            message: "Category name is too long",
        }),
});

export const itemSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, {
            message: "Item name must contain at least 3 characters",
        })
        .max(100, {
            message: "Item name is too long",
        }),

    price: z
        .number({
            message: "Price must be a number",
        })
        .positive({
            message: "Price must be a positive number",
        }),

    categoryId: z
        .string()
        .min(1, {
            message: "Category is required",
        }),

    imageUrl: z
        .string()
        .trim()
        .url({ message: "Image URL is invalid" })
        .optional()
        .or(z.literal("")),

    imagePublicId: z
        .string()
        .trim()
        .optional()
        .or(z.literal("")),

    available: z.boolean().default(true),
});