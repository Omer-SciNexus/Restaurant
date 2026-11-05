import type { ProfileConflicts } from "@/lib/diet";
import { allergenNames } from "./Tags";

/** The same warning wherever a dish meets a guest's saved profile. Names the dish when listed with others. */
export function ProfileWarning({ conflicts, dishName }: { conflicts: ProfileConflicts; dishName?: string }) {
  return (
    <div role="alert" className="rounded-brand border border-danger/40 bg-danger-soft p-3 text-sm text-danger" data-testid="profile-warning">
      <strong>{dishName ? `Check before ordering ${dishName}.` : "Check before ordering."}</strong>
      {conflicts.contains.length > 0 ? <span> Contains {allergenNames(conflicts.contains)}, which is in your allergy profile.</span> : null}
      {conflicts.mayContain.length > 0 ? <span> May contain {allergenNames(conflicts.mayContain)}.</span> : null}
      {conflicts.unmetDiets.length > 0 ? <span> Does not fit your saved diet.</span> : null}
    </div>
  );
}
