import { inputClass } from "../ui/Form";

/** Admins can look at any branch. Plain GET form: staff never see it, they have one branch. */
export function BranchSwitcher({ action, branches, current }: { action: string; branches: { slug: string; name: string }[]; current: string }) {
  if (branches.length <= 1) return null;
  return (
    <form action={action} className="flex items-center gap-2">
      <label htmlFor="branch" className="text-sm font-medium">
        Branch
      </label>
      <select id="branch" name="branch" defaultValue={current} className={`${inputClass} w-auto`}>
        {branches.map((branch) => (
          <option key={branch.slug} value={branch.slug}>
            {branch.name}
          </option>
        ))}
      </select>
      <button type="submit" className="min-h-11 rounded-brand border border-forest/40 px-3 text-sm text-forest hover:bg-sage/60">
        Show
      </button>
    </form>
  );
}
