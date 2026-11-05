"use client";

import { addPersonAction, changePersonRoleAction, removePersonAction } from "@/lib/actions/manager";
import { ROLE_LABEL } from "@/lib/admin/roles";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Form";
import { FormResult } from "./FormResult";
import { useAdminForm } from "./useAdminForm";

type Person = { id: string; name: string | null; email: string | null; role: "STAFF" | "DRIVER" };

function PersonRow({ person, branchId }: { person: Person; branchId: string }) {
  const change = useAdminForm(changePersonRoleAction.bind(null, person.id));
  const remove = useAdminForm(removePersonAction.bind(null, person.id));
  const pending = change.pending || remove.pending;
  const other = person.role === "STAFF" ? "DRIVER" : "STAFF";

  return (
    <li className="py-3" data-testid={`person-${person.email}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="mr-auto min-w-40">
          <p className="text-sm font-medium">{person.name ?? person.email}</p>
          <p className="text-xs text-stone">
            {ROLE_LABEL[person.role]}, {person.email}
          </p>
        </div>
        <form {...change.formProps}>
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="role" value={other} />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            Make {ROLE_LABEL[other].toLowerCase()}
          </Button>
        </form>
        <form {...remove.formProps}>
          <input type="hidden" name="branchId" value={branchId} />
          <Button type="submit" size="sm" variant="danger" disabled={pending} aria-label={`Remove ${person.name ?? person.email} from this branch`}>
            Remove
          </Button>
        </form>
      </div>
      <FormResult error={change.state.error ?? remove.state.error} pending={pending} />
    </li>
  );
}

export function BranchPeople({ branchId, people }: { branchId: string; people: Person[] }) {
  const add = useAdminForm(addPersonAction);
  const fields = add.state.fields;

  return (
    <div className="space-y-4 rounded-brand bg-paper p-5 shadow-soft">
      {people.length === 0 ? <p className="text-sm text-stone">Nobody is assigned to this branch yet.</p> : null}
      <ul className="divide-y divide-line">
        {people.map((person) => (
          <PersonRow key={person.id} person={person} branchId={branchId} />
        ))}
      </ul>
      <form {...add.formProps} className="space-y-3 border-t border-line pt-4">
        <h3 className="font-heading text-xl">Add someone</h3>
        <p className="text-xs text-stone">They sign up for an account first, then you add them by its email. Managers can add staff and drivers.</p>
        <input type="hidden" name="branchId" value={branchId} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field name="email" label="Email of their account" type="email" autoComplete="off" required error={fields?.email?.[0]} />
          <Field id="new-role" label="Role" error={fields?.role?.[0]}>
            <select id="new-role" name="role" defaultValue="STAFF" className={inputClass}>
              <option value="STAFF">Staff</option>
              <option value="DRIVER">Driver</option>
            </select>
          </Field>
        </div>
        <FormResult error={add.state.error} saved={add.state.ok ? "Added to this branch." : false} pending={add.pending} />
        <Button type="submit" size="sm" variant="secondary" disabled={add.pending}>
          {add.pending ? "Adding..." : "Add to this branch"}
        </Button>
      </form>
    </div>
  );
}
