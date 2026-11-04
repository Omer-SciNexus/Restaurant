import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm, RequestResetForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-3xl">{token ? "Choose a new password" : "Reset your password"}</h1>
      <p className="mb-6 mt-2 text-sm text-stone">{token ? "This link works once." : "We will email you a link."}</p>
      {token ? <NewPasswordForm token={token} /> : <RequestResetForm />}
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-forest underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
