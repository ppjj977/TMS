import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AccountStatusBadge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { jobs: true, contacts: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Accounts and their contacts"
        action={<LinkButton href="/customers/new">+ New customer</LinkButton>}
      />

      {customers.length === 0 ? (
        <EmptyState message="No customers yet. Add your first account." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contacts</th>
                  <th className="px-4 py-3">Jobs</th>
                  <th className="px-4 py-3">Terms</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.accountCode}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/customers/${c.id}`} className="text-brand-600 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c._count.contacts}</td>
                    <td className="px-4 py-3">{c._count.jobs}</td>
                    <td className="px-4 py-3">{c.paymentTerms} days</td>
                    <td className="px-4 py-3"><AccountStatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
