import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/ProfileForm";
import { Button } from "@/components/ui/Button";
import { requirePageUser, signOut } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountPage() {
  const user = await requirePageUser("/account");
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl">Your account</h1>
      <p className="mt-2 text-stone">Signed in as {user.email}.</p>

      <section aria-labelledby="profile-heading" className="mt-6 rounded-brand bg-paper p-4 shadow-soft sm:p-5">
        <h2 id="profile-heading" className="text-2xl">
          Profile
        </h2>
        <ProfileForm name={user.name ?? ""} phone={user.phone ?? ""} />
      </section>

      {/* Saved cards need live Stripe customer accounts, which are not set up yet. */}
      <section aria-labelledby="payment-heading" className="mt-6 rounded-brand bg-paper p-4 shadow-soft sm:p-5">
        <h2 id="payment-heading" className="text-2xl">
          Payment methods
        </h2>
        <p className="mt-2 text-sm text-stone">Saved payment methods are not available yet. They depend on live Stripe customer accounts, which we are still setting up. For now, you enter your payment details at checkout each time.</p>
      </section>

      <form
        className="mt-6"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
