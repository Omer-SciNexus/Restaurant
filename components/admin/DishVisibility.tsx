"use client";

import { useState, useTransition } from "react";
import { deleteDishAction, setDishActiveAction } from "@/lib/actions/admin-menu";
import { Button } from "../ui/Button";
import { FormResult } from "./FormResult";

/** Hide or show a dish. Delete is only offered when the rules allow it, and the server checks again. */
export function DishVisibility({ dishId, isActive, deleteBlockedBy }: { dishId: string; isActive: boolean; deleteBlockedBy: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | false>(false);
  const [confirming, setConfirming] = useState(false);

  function run(action: () => Promise<{ error?: string }>, done?: string) {
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else if (done) setSaved(done);
    });
  }

  return (
    <div className="space-y-3 rounded-brand bg-paper p-5 shadow-soft">
      <p className="text-sm">
        <span className="font-medium">{isActive ? "On the menu." : "Hidden."}</span> {isActive ? "Guests can see and order this dish." : "Guests cannot see or order this dish."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => setDishActiveAction(dishId, !isActive), isActive ? "Hidden from the menu." : "Now on the menu.")}>
          {isActive ? "Hide from the menu" : "Put on the menu"}
        </Button>
        {deleteBlockedBy ? null : confirming ? (
          <>
            <Button type="button" variant="danger" disabled={pending} onClick={() => run(() => deleteDishAction(dishId))}>
              Yes, delete this dish
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button type="button" variant="danger" disabled={pending} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
      {deleteBlockedBy ? <p className="text-sm text-stone">{deleteBlockedBy}</p> : null}
      <FormResult error={error} saved={saved} pending={pending} />
    </div>
  );
}
