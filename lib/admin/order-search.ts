import { prisma } from "../db";

const PHONE_SHAPED = /^[\d\s()+.-]+$/;

/** Phone numbers are stored as guests typed them, so a search compares digits only. */
export function parseOrderQuery(raw: string): { text: string; digits: string | null } {
  const text = raw.trim().slice(0, 100);
  const digits = text.replace(/\D/g, "");
  return { text, digits: PHONE_SHAPED.test(text) && digits.length >= 4 ? digits : null };
}

const LIMIT = 50;

/** Across all branches, newest first. With no search it lists the latest paid orders. */
export async function searchOrders(raw: string) {
  const { text, digits } = parseOrderQuery(raw);
  const include = { branch: { select: { name: true } } };
  if (!text) {
    return prisma.order.findMany({ where: { status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, take: LIMIT, include });
  }
  const phoneMatches = digits
    ? await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM orders WHERE regexp_replace("customerPhone", '[^0-9]', '', 'g') LIKE ${`%${digits}%`} ORDER BY "createdAt" DESC LIMIT ${LIMIT}`
    : [];
  return prisma.order.findMany({
    where: {
      OR: [
        { reference: { contains: text, mode: "insensitive" } },
        { customerEmail: { contains: text, mode: "insensitive" } },
        { id: { in: phoneMatches.map((row) => row.id) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    include,
  });
}
