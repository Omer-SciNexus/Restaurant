"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { setQuantity, useCart, useCartReady } from "@/lib/cart";
import { formatMoney } from "@/lib/domain";
import { LinkButton } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormError } from "../ui/Form";

type Totals = { subtotalCents: number; taxCents: number; totalCents: number };

export function CartView({ branch }: { branch: { id: string; name: string } | null }) {
  const lines = useCart();
  const ready = useCartReady();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prices shown come from the server, which also catches a dish that has since sold out.
  useEffect(() => {
    if (!branch || lines.length === 0) return;
    let ignore = false;
    fetch("/api/v1/orders/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: branch.id,
        type: "PICKUP",
        lines: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity, optionIds: line.optionIds, note: line.note })),
      }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (ignore) return;
        if (response.ok) {
          setTotals(body.quote);
          setError(null);
        } else {
          setTotals(null);
          setError(body.error?.message ?? "We could not check your cart.");
        }
      })
      .catch(() => {
        if (!ignore) setError("We could not check your cart. Please check your connection.");
      });
    return () => {
      ignore = true;
    };
  }, [branch, lines]);

  // Without this, a full cart flashes "empty" while the page loads.
  if (!ready) return <div aria-hidden="true" className="mt-6 h-40 animate-pulse rounded-brand bg-oat-deep" />;

  if (lines.length === 0) {
    return (
      <EmptyState image="/images/illustrations/empty-cart.png" title="Your cart is empty">
        <p>Nothing here yet.</p>
        <LinkButton href="/menu" className="mt-4">
          Browse the menu
        </LinkButton>
      </EmptyState>
    );
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-line rounded-brand bg-paper px-4 shadow-soft">
        {lines.map((line) => (
          <li key={line.key} className="flex gap-4 py-4">
            <Image src={line.imageUrl} alt="" width={80} height={80} className="h-20 w-20 rounded-brand object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{line.name}</p>
              {line.optionSummary.length > 0 ? <p className="text-sm text-stone">{line.optionSummary.join(", ")}</p> : null}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-brand border border-stone/40">
                  <button type="button" aria-label={`One fewer ${line.name}`} onClick={() => setQuantity(line.key, line.quantity - 1)} className="h-10 w-10 text-lg">
                    −
                  </button>
                  <span aria-live="polite" className="w-6 text-center text-sm font-medium">
                    {line.quantity}
                  </span>
                  <button type="button" aria-label={`One more ${line.name}`} onClick={() => setQuantity(line.key, line.quantity + 1)} className="h-10 w-10 text-lg">
                    +
                  </button>
                </div>
                <span className="font-medium">{formatMoney(line.unitPriceCents * line.quantity)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {totals ? (
        <div className="mt-4 text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Tax</dt>
              <dd>{formatMoney(totals.taxCents)}</dd>
            </div>
          </dl>
          <p className="pt-2 text-xs text-stone">Any delivery fee is shown at checkout, before you pay.</p>
        </div>
      ) : null}

      {branch ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-stone">
            Ordering from <strong className="text-bark">{branch.name}</strong>.{" "}
            <Link href="/branches" className="text-forest underline">
              Change
            </Link>
          </p>
          <LinkButton href="/checkout" size="lg" aria-disabled={Boolean(error)} className={error ? "pointer-events-none opacity-50" : ""}>
            Checkout
          </LinkButton>
        </div>
      ) : (
        <p className="mt-6 text-sm">
          <Link href="/branches" className="font-medium text-forest underline">
            Choose a branch
          </Link>{" "}
          to continue.
        </p>
      )}
    </div>
  );
}
