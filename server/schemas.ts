import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  discount_price: z.number().nullable().optional(),
  stock: z.number().int().nonnegative(),
  category: z.string(),
  images: z.array(z.string()),
  is_new: z.boolean().optional(),
  is_sale: z.boolean().optional(),
});
