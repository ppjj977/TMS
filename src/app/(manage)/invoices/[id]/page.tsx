import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { setInvoiceStatus, voidInvoice } from "@/actions/invoices";
import { getCompanySetting } from "@/lib/company";
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
  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { customer: true, lines: true } }),
    getCompanySetting(),
  ]);
  if (!invoice) notFound();
  const c = invoice.customer;

  return (
    <div>
      <PageHeader
        title={invoice.number}
        subtitle={invoice.customer.name}
        action={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Link
              href={`/invoice/${invoice.id}`}
              target="_blank"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Print / PDF
            </Link>
            <Link href="/invoices" className="text-sm font-medium text-brand-600 hover:underline">
              ← Invoices
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap justify-between gap-6">
              <div className="text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">From</div>
                <div className="font-semibold text-slate-900">{company.name}</div>
                <div className="text-slate-600">
                  {[company.addressLine1, company.addressLine2, company.city, company.postcode].filter(Boolean).join(", ")}
                </div>
                {company.vatNumber && <div className="text-slate-500">VAT {company.vatNumber}</div>}
                {company.companyReg && <div className="text-slate-500">Reg {company.companyReg}</div>}
              </div>
              <div className="text-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Bill to</div>
                <div className="font-semibold text-slate-900">{c.name}</div>
                <div className="text-slate-600">
                  {[c.addressLine1, c.addressLine2, c.city, c.postcode].filter(Boolean).join(", ")}
                </div>
                <div className="text-slate-500">Account {c.accountCode}</div>
              </div>
            </div>
            {(company.bankName || company.sortCode) && (
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Pay to {company.bankName} · Sort {company.sortCode} · Acc {company.accountNumber}
              </div>
            )}
          </Card>

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
                <tr className="border-t border-slate-200">
                  <td className="py-2 text-right font-medium text-slate-500">Subtotal</td>
                  <td className="py-2 text-right tnum">{money(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-right font-medium text-slate-500">VAT</td>
                  <td className="py-2 text-right tnum">{money(invoice.vat)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-right font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold tnum">{money(invoice.total)}</td>
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
