import type { Metadata } from "next";
import { UserRoleForm } from "@/components/admin/UserRoleForm";
import { ADMIN_ROLES, type Role } from "@/lib/access";
import { ROLE_LABEL } from "@/lib/admin/roles";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "People" };

const LIMIT = 100;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requirePageRole(ADMIN_ROLES, "/admin/users");
  const { q = "" } = await searchParams;
  const search = q.trim().slice(0, 100);
  const [people, branches] = await Promise.all([
    prisma.user.findMany({
      // With no search this is the team. Customers only appear when someone looks for them.
      where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : { role: { not: "CUSTOMER" } },
      orderBy: [{ role: "desc" }, { name: "asc" }],
      take: LIMIT,
      select: { id: true, name: true, email: true, role: true, branchId: true, branch: { select: { name: true } } },
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl">People</h1>
      <p className="mt-1 text-sm text-stone">Staff, drivers and managers belong to one branch. Admins and customers have none. Role changes apply immediately.</p>
      <form action="/admin/users" className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">
          Search people
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Name or email, including customers" className="min-h-11 w-full max-w-md rounded-brand border border-stone/50 bg-paper px-3 text-sm" />
        <button type="submit" className="min-h-11 rounded-brand border border-forest/40 px-4 text-sm text-forest hover:bg-sage/60">
          Search
        </button>
      </form>

      {search && people.length === 0 ? (
        <p role="status" className="mt-4 rounded-brand bg-paper p-4 text-sm shadow-soft">
          Nobody matches &quot;{search}&quot;.
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-line rounded-brand bg-paper px-5 shadow-soft">
        {people.map((person) => (
          <li key={person.id} className="py-4" data-testid={`person-${person.email}`}>
            <p className="text-sm font-medium">{person.name ?? "No name"}</p>
            <p className="mb-2 text-xs text-stone">
              {person.email} · {ROLE_LABEL[person.role as Role]}
              {person.branch ? `, ${person.branch.name}` : ""}
            </p>
            {person.id === me.id ? (
              <p className="text-sm text-stone">This is you. Another admin has to change your role, so the system always keeps an admin.</p>
            ) : (
              <UserRoleForm user={{ id: person.id, name: person.name, role: person.role as Role, branchId: person.branchId }} branches={branches} />
            )}
          </li>
        ))}
      </ul>
      {people.length === LIMIT ? <p className="mt-2 text-xs text-stone">Showing the first {LIMIT}. Search to narrow this down.</p> : null}
    </div>
  );
}
