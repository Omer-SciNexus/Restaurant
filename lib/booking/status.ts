// What staff can do to a reservation. Guests change and cancel through lib/booking/service.ts.

export const RESERVATION_STATUSES = ["PENDING_DEPOSIT", "CONFIRMED", "SEATED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type StaffReservationStatus = "SEATED" | "NO_SHOW" | "COMPLETED";

const STAFF_RULES: Record<ReservationStatus, readonly StaffReservationStatus[]> = {
  PENDING_DEPOSIT: [],
  CONFIRMED: ["SEATED", "NO_SHOW"],
  SEATED: ["COMPLETED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export function staffReservationActions(status: ReservationStatus): readonly StaffReservationStatus[] {
  return STAFF_RULES[status];
}

/** Guests can still walk in on time, so a table can only be marked a no-show once its time has come. */
export function canStaffMove(from: ReservationStatus, to: StaffReservationStatus, startsAt: Date, at: Date): boolean {
  if (!STAFF_RULES[from].includes(to)) return false;
  return to !== "NO_SHOW" || startsAt <= at;
}

export const RESERVATION_LABEL: Record<ReservationStatus, string> = {
  PENDING_DEPOSIT: "Waiting for deposit",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Finished",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

export const OCCASIONS = ["Birthday", "Anniversary", "Business meal", "Other celebration"] as const;
