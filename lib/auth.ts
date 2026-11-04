import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { type Actor, canAccessBranch, hasRole, type Role } from "./access";
import { ApiError } from "./api";
import { prisma } from "./db";
import { services } from "./env";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return valid ? { id: user.id, name: user.name, email: user.email } : null;
      },
    }),
    ...(services.google ? [Google] : []),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  branchId: true,
  diets: true,
  allergies: true,
} as const;

/**
 * The signed-in user, read fresh from the database on every request. The session only
 * says who someone is; role and branch always come from here, so removing a staff member
 * or changing their branch takes effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, select: userSelect });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// ---- Pages: send people to sign in, or away if their role does not fit.

export async function requirePageUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requirePageRole(roles: readonly Role[], next: string): Promise<CurrentUser> {
  const user = await requirePageUser(next);
  if (!hasRole(user, roles)) redirect("/?denied=1");
  return user;
}

// ---- API routes and server actions: fail with a status code.

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  return user;
}

export async function requireApiRole(roles: readonly Role[]): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!hasRole(user, roles)) throw new ApiError(403, "FORBIDDEN", "You do not have access to this.");
  return user;
}

export function requireBranchAccess(actor: Actor, branchId: string): void {
  if (!canAccessBranch(actor, branchId)) throw new ApiError(403, "FORBIDDEN", "This belongs to another branch.");
}
