"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { clearCart, useCart, useCartReady } from "@/lib/cart";
import { formatMoney, type Allergen, type OrderType } from "@/lib/domain";
import type { Quote } from "@/lib/orders/service";
import { Button, LinkButton } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Field, FormError, inputClass } from "../ui/Form";
import { ProfileWarning } from "../ui/ProfileWarning";
import { allergenNames } from "../ui/Tags";
import { PaymentStep, type StartedPayment } from "./PaymentStep";

type SavedAddress = { id: string; label: string; street: string; city: string; notes: string | null };

type Props = {
  branch: { id: string; name: string; address: string; lat: number; lng: number; onlineOrderingOpen: boolean; deliveryArea: string };
  isOpenNow: boolean;
  slots: { iso: string; label: string }[];
  user: { name: string; email: string; phone: string; allergies: Allergen[]; addresses: SavedAddress[] } | null;
  providers: { stripe: boolean; paypal: boolean };
};

type FieldErrors = Record<string, string[] | undefined>;

export function CheckoutForm({ branch, isOpenNow, slots, user, providers }: Props) {
  const router = useRouter();
  const lines = useCart();
  const ready = useCartReady();
  const [type, setType] = useState<OrderType>("PICKUP");
  const [scheduledFor, setScheduledFor] = useState(isOpenNow ? "" : (slots[0]?.iso ?? ""));
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [savedAddressId, setSavedAddressId] = useState("");
  const [quote, setTotals] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState<StartedPayment | null>(null);

  const cartLines = lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity, optionIds: line.optionIds, note: line.note }));
  const cartKey = JSON.stringify(cartLines);
  const addressReady = street.trim().length >= 3 && city.trim().length >= 2;
  // A delivery total means nothing until there is an address to check it against.
  const totals = type === "DELIVERY" && !addressReady ? null : quote;

  function chooseSavedAddress(id: string) {
    const saved = user?.addresses.find((address) => address.id === id);
    setSavedAddressId(id);
    setStreet(saved?.street ?? "");
    setCity(saved?.city ?? "");
    setNotes(saved?.notes ?? "");
  }

  // Totals always come from the server, and update when the type or address changes.
  useEffect(() => {
    if (lines.length === 0 || started || (type === "DELIVERY" && !addressReady)) return;
    let ignore = false;
    const timer = setTimeout(() => {
      fetch("/api/v1/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          type,
          lines: JSON.parse(cartKey),
          scheduledFor: scheduledFor || null,
          address: type === "DELIVERY" ? { street, city } : undefined,
        }),
      })
        .then(async (response) => {
          const body = await response.json();
          if (ignore) return;
          if (response.ok) {
            setTotals(body.quote);
            setError(body.quote.deliverable ? null : `That address is outside ${branch.name}'s delivery zone. Try pickup or another branch.`);
          } else {
            setTotals(null);
            setError(body.error?.message ?? "We could not price your order.");
          }
        })
        .catch(() => {
          if (!ignore) setError("We could not reach the server. Please check your connection.");
        });
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [branch.id, branch.name, cartKey, city, scheduledFor, started, street, type, addressReady, lines.length]);

  const onPaid = useCallback(
    (orderId: string) => {
      clearCart();
      router.push(`/order/${orderId}`);
    },
    [router],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branch.id,
          type,
          lines: cartLines,
          scheduledFor: scheduledFor || null,
          address: type === "DELIVERY" ? { street, city, notes: notes || undefined } : undefined,
          customerName: form.get("name"),
          customerEmail: form.get("email"),
          customerPhone: form.get("phone"),
          allergyNote: String(form.get("allergy") ?? "") || undefined,
          paymentMethod: method,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setFieldErrors(body.error?.fields ?? {});
        setError(body.error?.message ?? "We could not place your order.");
        return;
      }
      setStarted(body);
    } catch {
      setError("We could not reach the server. Your card has not been charged.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return <div aria-hidden="true" className="mt-6 h-96 animate-pulse rounded-brand bg-oat-deep" />;

  if (lines.length === 0 && !started) {
    return (
      <EmptyState image="/images/illustrations/empty-cart.png" title="Your cart is empty">
        <LinkButton href="/menu" className="mt-4">
          Browse the menu
        </LinkButton>
      </EmptyState>
    );
  }

  const closedAllDay = !isOpenNow && slots.length === 0;
  const blocked = !branch.onlineOrderingOpen || closedAllDay;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {started ? (
          <PaymentStep started={started} onPaid={onPaid} />
        ) : (
          <form onSubmit={submit} noValidate className="space-y-8">
            <fieldset>
              <legend className="font-heading text-2xl">How would you like it?</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["PICKUP", "DELIVERY"] as const).map((option) => (
                  <label key={option} className={`cursor-pointer rounded-brand border-2 bg-paper p-4 has-focus-visible:outline-3 has-focus-visible:outline-forest ${type === option ? "border-forest" : "border-transparent"}`}>
                    <input type="radio" name="type" className="sr-only" checked={type === option} onChange={() => setType(option)} />
                    <span className="block font-medium">{option === "PICKUP" ? "Pickup" : "Delivery"}</span>
                    <span className="text-sm text-stone">{option === "PICKUP" ? `From ${branch.name}` : branch.deliveryArea}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {type === "DELIVERY" ? (
              <fieldset className="space-y-3">
                <legend className="font-heading text-2xl">Delivery address</legend>
                {user && user.addresses.length > 0 ? (
                  <div>
                    <label htmlFor="saved-address" className="mb-1 block text-sm font-medium">
                      Saved addresses
                    </label>
                    <select id="saved-address" value={savedAddressId} onChange={(e) => chooseSavedAddress(e.target.value)} className={inputClass}>
                      <option value="">Enter a new address</option>
                      {user.addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label}: {address.street}, {address.city}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <Field label="Street address" name="street" autoComplete="street-address" value={street} onChange={(e) => setStreet(e.target.value)} error={fieldErrors.address?.[0]} />
                <Field label="City" name="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                <Field label="Notes for the driver (optional)" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, floor, where to leave it" />
              </fieldset>
            ) : null}

            <div>
              <label htmlFor="time" className="font-heading text-2xl">
                When?
              </label>
              <select id="time" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className={`${inputClass} mt-3`}>
                {isOpenNow ? <option value="">As soon as possible</option> : null}
                {slots.map((slot) => (
                  <option key={slot.iso} value={slot.iso}>
                    Today at {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-3">
              <legend className="font-heading text-2xl">Your details</legend>
              {user ? null : (
                <p className="text-sm text-stone">
                  No account needed.{" "}
                  <Link href="/login?next=/checkout" className="text-forest underline">
                    Sign in
                  </Link>{" "}
                  to use saved details.
                </p>
              )}
              <Field label="Name" name="name" autoComplete="name" required defaultValue={user?.name} error={fieldErrors.customerName?.[0]} />
              <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={fieldErrors.customerEmail?.[0]} />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" required defaultValue={user?.phone} hint="We text you when it is ready or on the way." error={fieldErrors.customerPhone?.[0]} />
              <div>
                <label htmlFor="allergy" className="mb-1 block text-sm font-medium">
                  Any allergies we should know about? (optional)
                </label>
                <textarea
                  id="allergy"
                  name="allergy"
                  rows={2}
                  maxLength={500}
                  className={inputClass}
                  placeholder="We will show this to the kitchen"
                  defaultValue={user && user.allergies.length > 0 ? `Allergic to ${allergenNames(user.allergies)}.` : undefined}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-heading text-2xl">Payment</legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(
                  [
                    ["card", "Card or wallet", "Card, Apple Pay, Google Pay"],
                    ["paypal", "PayPal", "Pay with your PayPal account"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className={`cursor-pointer rounded-brand border-2 bg-paper p-4 has-focus-visible:outline-3 has-focus-visible:outline-forest ${method === value ? "border-forest" : "border-transparent"}`}>
                    <input type="radio" name="method" className="sr-only" checked={method === value} onChange={() => setMethod(value)} />
                    <span className="block font-medium">{label}</span>
                    <span className="text-sm text-stone">{hint}</span>
                  </label>
                ))}
              </div>
              {!providers.stripe && !providers.paypal ? <p className="mt-2 text-xs text-stone">Test mode: payment is simulated, no money moves.</p> : null}
            </fieldset>

            <FormError message={error} />
            {blocked ? <FormError message={closedAllDay ? `${branch.name} has closed for today. Please order tomorrow or choose another branch.` : "This branch is taking orders in store only right now."} /> : null}

            <Button type="submit" size="lg" className="w-full" disabled={submitting || blocked || !totals || (type === "DELIVERY" && !totals.deliverable)}>
              {submitting ? "Placing your order..." : totals ? `Continue to pay ${formatMoney(totals.totalCents)}` : "Continue to pay"}
            </Button>
          </form>
        )}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-brand bg-paper p-5 shadow-soft">
          <h2 className="text-xl">Your order</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3">
                <span>
                  {line.quantity} × {line.name}
                  {line.optionSummary.length > 0 ? <span className="block text-xs text-stone">{line.optionSummary.join(", ")}</span> : null}
                </span>
                <span>{formatMoney(line.unitPriceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          {totals ? (
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm" data-testid="totals">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatMoney(totals.subtotalCents)}</dd>
              </div>
              {type === "DELIVERY" ? (
                <div className="flex justify-between">
                  <dt>Delivery</dt>
                  <dd>{totals.deliveryFeeCents === 0 ? "Free" : formatMoney(totals.deliveryFeeCents)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd>{formatMoney(totals.taxCents)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd data-testid="total">{formatMoney(totals.totalCents)}</dd>
              </div>
            </dl>
          ) : type === "DELIVERY" ? (
            <p className="mt-4 border-t border-line pt-3 text-sm text-stone">Enter your address to see the delivery fee and total.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
