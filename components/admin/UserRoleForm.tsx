"use client";

import { useState } from "react";
import { assignRoleAction } from "@/lib/actions/admin-users";
import { ROLE_LABEL, roleNeedsBranch, ROLES } from "@/lib/admin/roles";
import type { Role } from "@/lib/access";
import { Button } from "../ui/Button";
import { inputClass } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Props = {
  user: { id: string; name: string | null; role: Role; branchId: string | null };
  branches: { id: string; name: string }[];
};

/** One person's role and branch. Admin and customer have no branch, so the choice goes away. */
export function UserRoleForm({ user, branches }: Props) {
  const { state, pending, formProps } = useAdminForm(assignRoleAction.bind(null, user.id));
  const [role, setRole] = useState<Role>(user.role);
  const needsBranch = roleNeedsBranch(role);

  return (
    <form {...formProps} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={`role-${user.id}`} className="mb-1 block text-xs font-medium">
          Role
        </label>
        <select id={`role-${user.id}`} name="role" value={role} onChange={(event) => setRole(event.target.value as Role)} className={`${inputClass} w-auto`}>
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABEL[option]}
            </option>
          ))}
        </select>
      </div>
      {needsBranch ? (
        <div>
          <label htmlFor={`branch-${user.id}`} className="mb-1 block text-xs font-medium">
            Branch
          </label>
          <select id={`branch-${user.id}`} name="branchId" defaultValue={user.branchId ?? ""} className={`${inputClass} w-auto`}>
            <option value="">Choose a branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="min-h-11" aria-label={`Save ${user.name ?? "this person"}`}>
        {pending ? "Saving..." : "Save"}
      </Button>
      <div className="w-full">
        <FormResult error={state.error} saved={state.ok ? "Saved. It applies from their next click." : false} pending={pending} />
      </div>
    </form>
  );
}
