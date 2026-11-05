import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { listAddresses } from "@/lib/addresses";
import { getCurrentUser } from "@/lib/auth";
import type { Allergen } from "@/lib/domain";
import { now, services } from "@/lib/env";
import { isOpenAt, orderTimeSlots } from "@/lib/hours";
import { branchHours } from "@/lib/menu";
import { getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [branch, user] = await Promise.all([getSelectedBranch(), getCurrentUser()]);
  if (!branch) redirect("/branches");
  const addresses = user ? await listAddresses(user.id) : [];
  const at = now();
  const hours = branchHours(branch);
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Checkout</h1>
      <CheckoutForm
        branch={{
          id: branch.id,
          name: branch.name,
          address: branch.address,
          lat: branch.lat,
          lng: branch.lng,
          onlineOrderingOpen: branch.onlineOrderingOpen,
          // A drawn zone has no single distance to quote.
          deliveryArea: branch.deliveryPolygon ? "In our delivery area" : `Within ${branch.deliveryRadiusKm} km`,
        }}
        isOpenNow={isOpenAt(hours, at, branch.timezone)}
        slots={orderTimeSlots(hours, at, branch.timezone)}
        user={user ? { name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", allergies: user.allergies as Allergen[], addresses } : null}
        providers={{ stripe: services.stripe, paypal: services.paypal }}
      />
    </div>
  );
}
