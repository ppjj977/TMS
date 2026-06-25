import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { generateInvoice } from "@/actions/invoices";
import {
  Button,
  Card,
  EmptyState,
  InvoiceStatusBadge,
  PageHeader,
} from "@/components/ui";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [ready, customers, invoices] = await Promise.all([
    prisma.job.groupBy({
      by: ["customerId"],
      where: { status: JobStatus.COMPLETED, invoiceId: null },
      _count: { _all: true },
      _sum: { customerCharge: true },
    }),
    prisma.customer.findMany({ select: { id: true, name: true } }),
    prisma.invoice.findMany({
      include: { customer: true, _count: { select: { lines: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Bill completed jobs and track payment" />

      {error === "nojobs" && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          That customer has no completed, un-invoiced jobs.
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Ready to invoice</h2>
      {ready.length === 0 ? (
        <EmptyState message="No completed jobs awaiting invoicing." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((r) => (
            <Card key={r.customerId} className="p-4">
              <div className="font-medium text-gray-900">{customerName(r.customerId)}</div>
              <div className="mt-1 text-sm text-gray-500">
                {r._count._all} job(s) · {money(r._sum.customerCharge ?? 0)}
              </div>
              <form action={generateInvoice.bind(null, r.customerId)} className="mt-3">
                <Button type="submit" className="w-full justify-center">
                  Generate invoice
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">All invoices</h2>
      {invoices.length === 0 ? (
        <EmptyState message="No invoices yet." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/invoices/${inv.id}`} className="text-brand-600 hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customer.name}</td>
                    <td className="px-4 py-3">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">{inv._count.lines}</td>
                    <td className="px-4 py-3">{money(inv.total)}</td>
                    <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
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
