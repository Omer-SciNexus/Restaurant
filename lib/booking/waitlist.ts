// Waitlist rules: who is told next when room frees up in a full slot.

export type WaitingEntry = { id: string; partySize: number; createdAt: Date };

function oldestFirst(a: WaitingEntry, b: WaitingEntry): number {
  return a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

/** Seats we can offer: free seats, less those already offered to someone who has not answered yet. */
export function offerableSeats(capacity: number, taken: number, outstandingOffers: readonly { partySize: number }[]): number {
  const offered = outstandingOffers.reduce((sum, entry) => sum + entry.partySize, 0);
  return Math.max(0, capacity - taken - offered);
}

/**
 * Oldest entry first. An entry too big for the room is passed over, not made to block a
 * smaller party behind it, and keeps its place for the next cancellation. Offers never add
 * up to more than the room there is.
 */
export function pickOffers<T extends WaitingEntry>(waiting: readonly T[], freeSeats: number): T[] {
  const picked: T[] = [];
  let left = freeSeats;
  for (const entry of [...waiting].sort(oldestFirst)) {
    if (entry.partySize <= left) {
      picked.push(entry);
      left -= entry.partySize;
    }
  }
  return picked;
}

export type OfferCheck = "OK" | "NOT_OFFERED" | "EXPIRED" | "FULL";

/** Confirming an offer checks capacity again: an offer does not hold seats. */
export function checkOffer(input: { status: string; startsAt: Date; at: Date; partySize: number; capacity: number; taken: number }): OfferCheck {
  if (input.status !== "OFFERED") return "NOT_OFFERED";
  if (input.startsAt <= input.at) return "EXPIRED";
  return input.taken + input.partySize <= input.capacity ? "OK" : "FULL";
}
