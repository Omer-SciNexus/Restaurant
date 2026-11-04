"use client";

import Link from "next/link";
import { useCartCount } from "@/lib/cart";

export function CartLink({ className = "" }: { className?: string }) {
  const count = useCartCount();
  return (
    <Link href="/cart" className={`relative inline-flex min-h-11 items-center gap-2 rounded-brand px-3 font-medium text-forest hover:bg-sage/60 ${className}`}>
      <CartIcon />
      <span>Cart</span>
      {count > 0 ? (
        <span data-testid="cart-count" className="rounded-full bg-forest px-2 py-0.5 text-xs font-semibold text-white">
          <span className="sr-only">items in cart: </span>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1.500 11.500h-11zM9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
