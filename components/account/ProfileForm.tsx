"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { callApi } from "@/lib/api-client";
import { Button } from "../ui/Button";
import { Field, FormError } from "../ui/Form";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(false);
    setError(null);
    setFields({});
    const result = await callApi("/api/v1/me", "PATCH", { name: form.get("name"), phone: form.get("phone") });
    setPending(false);
    if (!result.ok) {
      setError(result.fields ? null : result.message);
      setFields(result.fields ?? {});
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-4">
      <Field label="Name" name="name" autoComplete="name" required defaultValue={name} error={fields.name?.[0]} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={phone} hint="Used to reach you about an order." error={fields.phone?.[0]} />
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save profile"}
        </Button>
        <p role="status" className="text-sm text-stone">
          {saved ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}
