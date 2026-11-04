import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/site/AuthForms";
import { buttonClass } from "@/components/ui/Button";
import { signIn } from "@/lib/auth";
import { services } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <>
      <h1 className="text-3xl">Sign in</h1>
      <p className="mb-6 mt-2 text-sm text-stone">Your saved addresses, diet profile, orders and cookbook.</p>
      {reset ? (
        <p role="status" className="mb-4 rounded-brand bg-sage p-3 text-sm">
          Your password has been changed. Please sign in.
        </p>
      ) : null}
      <LoginForm next={safeNext} />
      {services.google ? (
        <form
          className="mt-3"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: safeNext ?? "/account" });
          }}
        >
          <button type="submit" className={buttonClass("secondary", "lg", "w-full")}>
            Continue with Google
          </button>
        </form>
      ) : null}
      <div className="mt-6 flex justify-between text-sm">
        <Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup"} className="text-forest underline">
          Create an account
        </Link>
        <Link href="/reset-password" className="text-forest underline">
          Forgot your password?
        </Link>
      </div>
    </>
  );
}
