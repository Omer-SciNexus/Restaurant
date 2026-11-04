import type { Metadata } from "next";
import { CartView } from "@/components/checkout/CartView";
import { getSelectedBranch } from "@/lib/selection";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const branch = await getSelectedBranch();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
      <h1 className="text-4xl">Your cart</h1>
      <CartView branch={branch ? { id: branch.id, name: branch.name } : null} />
    </div>
  );
}
