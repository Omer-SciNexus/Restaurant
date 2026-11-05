import { z } from "zod";
import { isRealDate } from "../booking/slots";

const isoDate = z.string().refine(isRealDate, "Choose a valid date");
const contact = {
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.email("Enter a valid email address").max(200),
  phone: z.string().trim().regex(/^[+\d][\d\s().-]{6,20}$/, "Enter a valid phone number"),
};
const paymentMethod = z.enum(["card", "paypal"]);
const partySize = z.number().int().min(1, "Enter how many people are coming").max(200);
const occasion = z.string().trim().max(60);
const specialRequests = z.string().trim().max(500);

export const slotsQuerySchema = z.object({
  date: isoDate.optional(),
  party: z.coerce.number().int().min(1).max(200).default(2),
  reservationId: z.string().min(1).optional(),
});

export const createReservationSchema = z.object({
  branchId: z.string().min(1),
  startsAt: z.iso.datetime(),
  partySize,
  ...contact,
  occasion: occasion.optional(),
  specialRequests: specialRequests.optional(),
  paymentMethod: paymentMethod.default("card"),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const changeReservationSchema = z.object({
  startsAt: z.iso.datetime().optional(),
  partySize: partySize.optional(),
  occasion: occasion.nullish(),
  specialRequests: specialRequests.nullish(),
});
export type ChangeReservationInput = z.infer<typeof changeReservationSchema>;

export const startDepositSchema = z.object({ paymentMethod });

export const joinWaitlistSchema = z.object({
  branchId: z.string().min(1),
  startsAt: z.iso.datetime(),
  partySize,
  ...contact,
});
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;

export const confirmOfferSchema = z.object({ paymentMethod: paymentMethod.default("card") });

export const staffDaySchema = z.object({ date: isoDate.optional(), branchId: z.string().min(1).optional() });

export const staffReservationSchema = z.object({ status: z.enum(["SEATED", "NO_SHOW", "COMPLETED"]) });

export const staffWaitlistSchema = z.object({ action: z.enum(["OFFER", "REMOVE"]) });

export const eventRequestSchema = z.object({
  type: z.enum(["PRIVATE_EVENT", "CATERING"]),
  branchId: z.string().min(1).nullish(),
  date: isoDate,
  guests: z.number().int().min(1, "Enter how many guests").max(5000),
  budgetCents: z.number().int().min(0).max(100_000_000).nullish(),
  menuNotes: z.string().trim().max(1000).optional(),
  allergies: z.string().trim().max(500).optional(),
  ...contact,
});
export type EventRequestInput = z.infer<typeof eventRequestSchema>;

export const eventQuoteSchema = z.object({
  quoteNotes: z.string().trim().max(2000).optional(),
});
