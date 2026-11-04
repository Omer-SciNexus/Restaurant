import { redirect } from "next/navigation";
import type { CurrentUser } from "./auth";
import { canAccessBranch } from "./access";
import { getBranches } from "./menu";

/**
 * Which branch a staff screen is showing. Staff and managers are fixed to their own branch;
 * admins pick one through ?branch=, and get the first branch by default.
 */
export async function resolveStaffBranch(user: CurrentUser, requestedSlug?: string) {
  const branches = await getBranches();
  if (user.role === "ADMIN") {
    return { branch: branches.find((b) => b.slug === requestedSlug) ?? branches[0]!, branches };
  }
  const own = branches.find((b) => b.id === user.branchId);
  if (!own || !canAccessBranch(user, own.id)) redirect("/?denied=1");
  return { branch: own, branches: [own] };
}
