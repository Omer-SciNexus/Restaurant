"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homeForRole } from "../access";
import { signIn } from "../auth";
import { prisma } from "../db";
import { siteUrl } from "../env";
import { sendEmail } from "../notify";

export type AuthFormState = { error?: string; fields?: Record<string, string[] | undefined>; done?: boolean };

/** Only same-site paths, so a crafted ?next= link cannot send someone to another website. */
function safeNext(raw: FormDataEntryValue | null): string | null {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

export async function loginAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").toLowerCase();
  const next = safeNext(form.get("next"));
  try {
    await signIn("credentials", { email, password: String(form.get("password") ?? ""), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "That email and password do not match." };
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  redirect(next ?? homeForRole(user?.role ?? "CUSTOMER"));
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export async function signupAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fields: z.flattenError(parsed.error).fieldErrors };
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "An account with this email already exists. Please sign in." };

  await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  await signIn("credentials", { email, password: parsed.data.password, redirect: false });
  redirect(safeNext(form.get("next")) ?? "/account/diet");
}

const RESET_LIFETIME_MS = 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Always answers the same way, so this form cannot be used to find out who has an account. */
export async function requestResetAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const parsed = z.email().safeParse(String(form.get("email") ?? "").toLowerCase());
  if (!parsed.success) return { fields: { email: ["Enter a valid email address"] } };

  const user = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true, email: true } });
  if (user?.email) {
    const token = randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_LIFETIME_MS) },
    });
    await sendEmail(user.email, "Reset your Nature Food password", `Choose a new password here (the link works for one hour):\n${siteUrl()}/reset-password?token=${token}`);
  }
  return { done: true };
}

export async function resetPasswordAction(_state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { fields: { password: ["Use at least 10 characters"] } };

  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(String(form.get("token") ?? "")) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "This reset link has expired. Please ask for a new one." };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  redirect("/login?reset=1");
}
