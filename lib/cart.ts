"use client";

import { useSyncExternalStore } from "react";

// The cart lives in the browser so guests can order without an account. Everything here is
// for display only: the server re-prices every line from the database before charging.

export type CartLine = {
  key: string;
  menuItemId: string;
  slug: string;
  name: string;
  imageUrl: string;
  quantity: number;
  optionIds: string[];
  optionSummary: string[];
  unitPriceCents: number;
  note?: string;
};

const STORAGE_KEY = "nf_cart_v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) lines = JSON.parse(raw) as CartLine[];
  } catch {
    lines = EMPTY;
  }
}

function commit(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing can block storage; the cart still works until the tab closes.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  load();
  return lines;
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** False on the server and during the first paint, when the saved cart cannot be read yet. */
export function useCartReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function useCartCount(): number {
  return useCart().reduce((sum, line) => sum + line.quantity, 0);
}

function lineKey(menuItemId: string, optionIds: readonly string[], note?: string) {
  return [menuItemId, [...optionIds].sort().join(","), note ?? ""].join("|");
}

export function addToCart(item: Omit<CartLine, "key" | "quantity">, quantity = 1) {
  load();
  const key = lineKey(item.menuItemId, item.optionIds, item.note);
  const existing = lines.find((line) => line.key === key);
  commit(
    existing
      ? lines.map((line) => (line.key === key ? { ...line, quantity: Math.min(line.quantity + quantity, 50) } : line))
      : [...lines, { ...item, key, quantity }],
  );
}

export function setQuantity(key: string, quantity: number) {
  load();
  commit(quantity <= 0 ? lines.filter((line) => line.key !== key) : lines.map((line) => (line.key === key ? { ...line, quantity: Math.min(quantity, 50) } : line)));
}

export function clearCart() {
  commit(EMPTY);
}
