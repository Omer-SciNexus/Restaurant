"use client";

import { useState, useTransition } from "react";
import { setAllOnlineOrderingAction, setOnlineOrderingAction } from "@/lib/actions/admin-branches";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

/** The rollback switch from the go-live plan. It applies to the next order, with nothing else to do. */
export function OrderingSwitch({ branchId, branchName, open }: { branchId: string; branchName: string; open: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setOnlineOrderingAction(branchId, !open);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-sm">
        {open ? (
          <span className="rounded-full bg-sage px-2.5 py-1 text-xs font-medium">Open for online orders</span>
        ) : (
          <span className="rounded-full bg-terracotta px-2.5 py-1 text-xs font-medium text-white">In-store only</span>
        )}
      </p>
      <Button type="button" size="sm" variant={open ? "danger" : "primary"} disabled={pending} onClick={toggle} aria-label={open ? `Switch to in-store only: ${branchName}` : `Open for online orders: ${branchName}`}>
        {pending ? "Switching..." : open ? "Switch to in-store only" : "Open for online orders"}
      </Button>
      <FormError message={error} />
    </div>
  );
}

/** Every branch at once. This one asks twice, in place, because it stops the whole business. */
export function AllBranchesSwitch({ branchCount }: { branchCount: number }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"open" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState("");

  function apply(open: boolean) {
    setError(null);
    setDone("");
    startTransition(async () => {
      const result = await setAllOnlineOrderingAction(open);
      setConfirming(null);
      if (result.error) setError(result.error);
      else setDone(open ? `All ${branchCount} branches are open for online orders.` : `All ${branchCount} branches are in-store only.`);
    });
  }

  return (
    <div className="space-y-2 rounded-brand bg-paper p-4 shadow-soft">
      <h2 className="font-body text-sm font-semibold">All branches</h2>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{confirming === "close" ? `Stop online orders at all ${branchCount} branches?` : `Open all ${branchCount} branches for online orders?`}</span>
          <Button type="button" size="sm" variant={confirming === "close" ? "danger" : "primary"} disabled={pending} onClick={() => apply(confirming === "open")}>
            {pending ? "Switching..." : "Yes, all branches"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>
            Leave them as they are
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="danger" onClick={() => setConfirming("close")}>
            Switch all to in-store only
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming("open")}>
            Open all for online orders
          </Button>
        </div>
      )}
      <p role="status" className="text-sm font-medium text-forest empty:hidden">
        {done}
      </p>
      <FormError message={error} />
    </div>
  );
}
