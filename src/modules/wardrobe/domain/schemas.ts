import { z } from "zod";
import { calendarDate } from "@/modules/planner/domain/calendar";
export const categories = [
  "TOP",
  "BOTTOM",
  "OUTERWEAR",
  "FOOTWEAR",
  "ONE_PIECE",
  "SPORTSWEAR",
  "ACCESSORY",
  "OTHER",
] as const;
export const statuses = [
  "AVAILABLE",
  "DIRTY",
  "LAUNDRY",
  "BORROWED",
  "REPAIR",
  "UNAVAILABLE",
] as const;
export const conditions = [
  "NEW",
  "EXCELLENT",
  "GOOD",
  "WORN",
  "DAMAGED",
] as const;
export const idSchema = z.uuid();
export const tags = z.array(z.string().trim().min(1).max(40)).max(20);
export const itemFilterSchema = z.object({
  search: z.string().max(120).optional(),
  category: z.enum(categories).optional(),
  status: z.enum(statuses).optional(),
});
export const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(categories),
  locationId: idSchema,
  status: z.enum(statuses).default("AVAILABLE"),
  condition: z.enum(conditions).default("GOOD"),
  subcategory: z.string().max(80).nullable().optional(),
  brand: z.string().max(80).nullable().optional(),
  size: z.string().max(40).nullable().optional(),
  primaryColor: z.string().max(40).nullable().optional(),
  colors: tags.default([]),
  seasons: tags.default([]),
  purchaseDate: calendarDate.nullable().optional(),
  purchasePriceCents: z
    .number()
    .int()
    .min(0)
    .max(100000000)
    .nullable()
    .optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("EUR"),
  sourceUrl: z
    .url()
    .refine((s) => /^https?:\/\//.test(s))
    .nullable()
    .optional(),
  notes: z.string().max(4000).nullable().optional(),
  favorite: z.boolean().default(false),
});
