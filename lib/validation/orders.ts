import { z } from "zod";
import { MAX_QUANTITY_PER_LINE } from "../pricing";

export const cartLineSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  optionIds: z.array(z.string().min(1)).max(30).default([]),
  note: z.string().trim().max(200).optional(),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

const addressSchema = z.object({
  street: z.string().trim().min(3, "Enter your street address").max(200),
  city: z.string().trim().min(2, "Enter your city").max(100),
  notes: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const quoteSchema = z.object({
  branchId: z.string().min(1),
  type: z.enum(["PICKUP", "DELIVERY"]),
  lines: z.array(cartLineSchema).min(1, "Your cart is empty.").max(50),
  scheduledFor: z.iso.datetime().nullish(),
  address: addressSchema.optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

export const createOrderSchema = quoteSchema.extend({
  customerName: z.string().trim().min(2, "Enter your name").max(100),
  customerEmail: z.email("Enter a valid email address").max(200),
  customerPhone: z.string().trim().regex(/^[+\d][\d\s().-]{6,20}$/, "Enter a valid phone number"),
  allergyNote: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["card", "paypal"]),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const staffStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "PREPARING", "READY", "COMPLETED"]),
  reason: z.string().trim().max(300).optional(),
});

export const assignDriverSchema = z.object({ driverId: z.string().min(1) });

export const driverUpdateSchema = z.object({ status: z.enum(["PICKED_UP", "DELIVERED"]) });

export const availabilitySchema = z.object({ menuItemId: z.string().min(1), isAvailable: z.boolean() });

export const bowlQuoteSchema = z.object({
  branchId: z.string().min(1).optional(),
  optionIds: z.array(z.string().min(1)).max(30),
});
