import { cookies } from "next/headers";
import { cache } from "react";
import { getBranchBySlug, getBranches } from "./menu";

export const BRANCH_COOKIE = "nf_branch";
export const DEFAULT_TIMEZONE = "America/Chicago";

/** The branch the guest chose, kept in a cookie so server pages can show its menu. */
export const getSelectedBranch = cache(async () => {
  const store = await cookies();
  const slug = store.get(BRANCH_COOKIE)?.value;
  return slug ? getBranchBySlug(slug) : null;
});

/** A timezone for rules that apply before a branch is chosen. */
export const getFallbackTimezone = cache(async () => {
  const branches = await getBranches();
  return branches[0]?.timezone ?? DEFAULT_TIMEZONE;
});
