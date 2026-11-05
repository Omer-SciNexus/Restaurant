import { z } from "zod";
import { ApiError } from "./api";
import { prisma } from "./db";
import { geocode } from "./geocode";
import { getBranchBySlug } from "./menu";
import { addressPatchSchema, addressSchema } from "./validation/account";

// Saved addresses. Every query here includes the owner's id, so one guest can never read or
// change another guest's row; someone else's address looks exactly like one that does not exist.

const MAX_ADDRESSES = 20;
const publicFields = { id: true, label: true, street: true, city: true, notes: true } as const;

const notFound = () => new ApiError(404, "ADDRESS_NOT_FOUND", "We could not find that address.");

/**
 * DEVELOPMENT STAND-IN. geocode() only returns null when there is no Google Maps key, and it
 * refuses in production, so this never runs for real guests. Local addresses are then stored
 * at the Downtown branch's own coordinates, which are not the guest's real location.
 */
const DEV_STAND_IN_BRANCH = "downtown";

async function locate(street: string, city: string) {
  const found = await geocode(street, city);
  if (found) return found;
  const branch = await getBranchBySlug(DEV_STAND_IN_BRANCH);
  if (!branch) throw new ApiError(503, "MAPS_UNAVAILABLE", "We cannot check addresses right now.");
  return { lat: branch.lat, lng: branch.lng };
}

export function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, select: publicFields, orderBy: { label: "asc" } });
}

export async function getAddress(userId: string, id: string) {
  const row = await prisma.address.findFirst({ where: { id, userId }, select: publicFields });
  if (!row) throw notFound();
  return row;
}

export async function createAddress(userId: string, raw: unknown) {
  const input = addressSchema.parse(raw);
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) throw new ApiError(422, "TOO_MANY_ADDRESSES", `You can save up to ${MAX_ADDRESSES} addresses. Please remove one first.`);
  const { lat, lng } = await locate(input.street, input.city);
  return prisma.address.create({ data: { ...input, lat, lng, userId }, select: publicFields });
}

export async function updateAddress(userId: string, id: string, raw: unknown) {
  const input = addressPatchSchema.parse(raw);
  const current = await prisma.address.findFirst({ where: { id, userId } });
  if (!current) throw notFound();

  const street = input.street ?? current.street;
  const city = input.city ?? current.city;
  const moved = street !== current.street || city !== current.city;
  const location = moved ? await locate(street, city) : {};

  const { count } = await prisma.address.updateMany({
    where: { id, userId },
    data: { ...input, notes: input.notes === undefined ? undefined : input.notes || null, ...location },
  });
  if (count === 0) throw notFound();
  return getAddress(userId, id);
}

export async function deleteAddress(userId: string, id: string) {
  const { count } = await prisma.address.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound();
}

export const addressIdSchema = z.string().min(1).max(60);
