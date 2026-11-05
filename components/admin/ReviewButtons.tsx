"use client";

import { useTransition, useState } from "react";
import { reviewChangeAction } from "@/lib/actions/nutrition";
import { Button } from "../ui/Button";
import { FormError } from "../ui/Form";

export function ReviewButtons({ changeId, canApprove }: { changeId: string; canApprove: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function review(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await reviewChangeAction(changeId, decision);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending || !canApprove} onClick={() => review("approve")}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => review("reject")}>
          Reject
        </Button>
        {canApprove ? null : <span className="text-xs text-stone">You proposed this, so someone else has to approve it.</span>}
      </div>
    </div>
  );
}
