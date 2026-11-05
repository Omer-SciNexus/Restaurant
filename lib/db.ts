import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // `prisma dev` has a single database session, so concurrent connections corrupt each other.
  // Set DATABASE_POOL_MAX=1 when using it; real Postgres keeps the driver's default.
  const max = Number(process.env.DATABASE_POOL_MAX) || undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, ...(max ? { max } : {}) }) });
}

// Reuse one client across hot reloads in development.
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
