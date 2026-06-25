import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { setInvoiceStatus, voidInvoice } from "@/actions/invoices";
import {
  Button,
  Card,
  InvoiceStatusBadge,
  PageHeader,
} from "@/components/ui";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!invoice) notFound();

  return (
    <div>
      <PageHeader
        title={invoice.number}
        subtitle={invoice.customer.name}
        action={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Link href="/invoices" className="text-sm font-medium text-brand-600 hover:underline">
              ← Invoices
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-5">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-2">
                      {line.jobId ? (
                        <Link href={`/bookings/${line.jobId}`} className="text-brand-600 hover:underline">
                          {line.description}
                        </Link>
                      ) : (
                        line.description
                      )}
                    </td>
                    <td className="py-2 text-right">{money(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="py-2 text-right font-medium text-gray-500">Subtotal</td>
                  <td className="py-2 text-right">{money(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-right font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold">{money(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Issued" value={formatDate(invoice.issueDate)} />
              <Row label="Due" value={formatDate(invoice.dueDate)} />
              <Row label="Terms" value={`${invoice.customer.paymentTerms} days`} />
            </dl>
          </Card>

          {invoice.status !== InvoiceStatus.VOID && (
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Actions</h2>
              <div className="flex flex-col gap-2">
                {invoice.status === InvoiceStatus.DRAFT && (
                  <form action={setInvoiceStatus.bind(null, invoice.id, InvoiceStatus.SENT)}>
                    <Button type="submit" className="w-full justify-center">Mark as sent</Button>
                  </form>
                )}
                {(invoice.status === InvoiceStatus.SENT ||
                  invoice.status === InvoiceStatus.DRAFT) && (
                  <form action={setInvoiceStatus.bind(null, invoice.id, InvoiceStatus.PAID)}>
                    <Button type="submit" variant="secondary" className="w-full justify-center">
                      Mark as paid
                    </Button>
                  </form>
                )}
                <form action={voidInvoice.bind(null, invoice.id)}>
                  <Button type="submit" variant="danger" className="w-full justify-center">
                    Void invoice
                  </Button>
                </form>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Voiding releases its jobs back to “completed” so they can be re-invoiced.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
