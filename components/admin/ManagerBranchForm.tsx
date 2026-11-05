"use client";

import { updateBranchOperationsAction } from "@/lib/actions/manager";
import { Button } from "../ui/Button";
import { BranchOperationsFields, type BranchOperations } from "./BranchFields";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

/** The branch id is a plain field on purpose: the server checks it against the signed-in person. */
export function ManagerBranchForm({ branch }: { branch: BranchOperations & { id: string } }) {
  const { state, pending, formProps } = useAdminForm(updateBranchOperationsAction);
  return (
    <form {...formProps} className="space-y-6 rounded-brand bg-paper p-5 shadow-soft" data-testid="branch-form">
      <input type="hidden" name="branchId" value={branch.id} />
      <BranchOperationsFields branch={branch} fields={state.fields} />
      <FormResult error={state.error} saved={state.ok ? "Saved." : false} pending={pending} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save branch"}
      </Button>
    </form>
  );
}
