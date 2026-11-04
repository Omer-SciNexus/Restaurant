import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <>
      <h1 className="text-3xl">Create an account</h1>
      <p className="mb-6 mt-2 text-sm text-stone">Save your diet and allergies once, and dishes that do not fit are flagged for you.</p>
      <SignupForm next={safeNext} />
      <p className="mt-6 text-sm">
        Already have one?{" "}
        <Link href="/login" className="text-forest underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
