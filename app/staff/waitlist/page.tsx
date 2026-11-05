import { BranchSwitcher } from "@/components/staff/BranchSwitcher";
import { WaitlistBoard } from "@/components/staff/WaitlistBoard";
import { STAFF_ROLES } from "@/lib/access";
import { requirePageRole } from "@/lib/auth";
import { listBranchWaitlist } from "@/lib/booking/staff";
import { resolveStaffBranch } from "@/lib/branch-scope";

export default async function StaffWaitlistPage({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const user = await requirePageRole(STAFF_ROLES, "/staff/waitlist");
  const { branch: slug } = await searchParams;
  const { branch, branches } = await resolveStaffBranch(user, slug);
  const entries = await listBranchWaitlist(branch);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Waitlist · {branch.name}</h1>
        <BranchSwitcher action="/staff/waitlist" branches={branches} current={branch.slug} />
      </div>
      <WaitlistBoard key={branch.id} branchId={branch.id} initial={entries} />
    </>
  );
}
