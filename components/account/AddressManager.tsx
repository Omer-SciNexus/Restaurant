"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { callApi } from "@/lib/api-client";
import { Button } from "../ui/Button";
import { Field, FormError, inputClass } from "../ui/Form";

export type AddressView = { id: string; label: string; street: string; city: string; notes: string | null };

function AddressFields({ idPrefix, values, fields }: { idPrefix: string; values?: AddressView; fields: Record<string, string[] | undefined> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${idPrefix}-label`} label="Name for this address" name="label" required placeholder="Home" defaultValue={values?.label} error={fields.label?.[0]} />
      <Field id={`${idPrefix}-street`} label="Street address" name="street" autoComplete="street-address" required defaultValue={values?.street} error={fields.street?.[0]} />
      <Field id={`${idPrefix}-city`} label="City" name="city" autoComplete="address-level2" required defaultValue={values?.city} error={fields.city?.[0]} />
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className="mb-1 block text-sm font-medium">
          Delivery notes
        </label>
        <textarea id={`${idPrefix}-notes`} name="notes" rows={2} maxLength={300} defaultValue={values?.notes ?? ""} placeholder="Gate code, which door, anything that helps" className={inputClass} />
      </div>
    </div>
  );
}

function bodyOf(form: HTMLFormElement) {
  const data = new FormData(form);
  return { label: data.get("label"), street: data.get("street"), city: data.get("city"), notes: data.get("notes") };
}

function AddressCard({ address, onChanged }: { address: AddressView; onChanged: (message: string) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const url = `/api/v1/me/addresses/${encodeURIComponent(address.id)}`;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    const result = await callApi(url, "PATCH", bodyOf(event.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.fields ? null : result.message);
      setFields(result.fields ?? {});
      return;
    }
    setMode("view");
    onChanged(`Saved ${address.label}.`);
  };

  const remove = async () => {
    setPending(true);
    setError(null);
    const result = await callApi(url, "DELETE");
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChanged(`Removed ${address.label}.`);
  };

  return (
    <li className="rounded-brand bg-paper p-4 shadow-soft" data-testid="address">
      {mode === "edit" ? (
        <form onSubmit={save} className="space-y-4">
          <h3 className="text-lg">Edit {address.label}</h3>
          <AddressFields idPrefix={`edit-${address.id}`} values={address} fields={fields} />
          <FormError message={error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save address"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("view")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <h3 className="text-lg">{address.label}</h3>
          <p className="mt-1 text-sm">
            {address.street}, {address.city}
          </p>
          {address.notes ? <p className="mt-1 text-sm text-stone">{address.notes}</p> : null}
          <FormError message={error} />
          {mode === "confirm" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Remove this address?</p>
              <Button type="button" variant="danger" size="sm" disabled={pending} onClick={remove}>
                Yes, remove it
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("view")}>
                Keep it
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode("edit")} aria-label={`Edit ${address.label}`}>
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("confirm")} aria-label={`Remove ${address.label}`}>
                Remove
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function AddressManager({ addresses }: { addresses: readonly AddressView[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState("");

  const onChanged = (text: string) => {
    setMessage(text);
    router.refresh();
  };

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setFields({});
    setMessage("");
    const result = await callApi("/api/v1/me/addresses", "POST", bodyOf(form));
    setPending(false);
    if (!result.ok) {
      setError(result.fields ? null : result.message);
      setFields(result.fields ?? {});
      return;
    }
    form.reset();
    onChanged("Address saved.");
  };

  return (
    <>
      <p role="status" className="mt-4 min-h-5 text-sm text-stone">
        {message}
      </p>
      {addresses.length > 0 ? (
        <ul className="mt-2 space-y-3">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} onChanged={onChanged} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-stone">No saved addresses yet.</p>
      )}

      <form onSubmit={add} className="mt-8 space-y-4 rounded-brand bg-oat-deep p-4 sm:p-5">
        <h2 className="text-2xl">Add an address</h2>
        <AddressFields idPrefix="new" fields={fields} />
        <FormError message={error} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save address"}
        </Button>
      </form>
    </>
  );
}
