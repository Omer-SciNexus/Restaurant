import type { Metadata } from "next";
import { AddressManager } from "@/components/account/AddressManager";
import { listAddresses } from "@/lib/addresses";
import { requirePageUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requirePageUser("/account/addresses");
  const addresses = await listAddresses(user.id);
  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl">Addresses</h1>
      <p className="mt-2 text-stone">Places we can deliver to. We check each one against the branch&apos;s delivery zone when you order.</p>
      <AddressManager addresses={addresses} />
    </div>
  );
}
