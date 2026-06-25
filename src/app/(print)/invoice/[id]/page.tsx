import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanySetting } from "@/lib/company";
import { PrintButton } from "@/components/print-button";
import { LogoMark } from "@/components/logo";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
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
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="rounded-xl bg-white p-10 shadow-card print:rounded-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={44} className="rounded-xl" />
            <div>
              <div className="text-lg font-semibold text-slate-900">{company.name}</div>
              <div className="text-xs text-slate-500">
                {[company.addressLine1, company.city, company.postcode].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">INVOICE</div>
            <div className="text-sm text-slate-500">{invoice.number}</div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Bill to</div>
            <div className="font-semibold text-slate-900">{c.name}</div>
            <div className="text-slate-600">
              {[c.addressLine1, c.addressLine2, c.city, c.postcode].filter(Boolean).join(", ")}
            </div>
            <div className="text-slate-500">Account {c.accountCode}</div>
          </div>
          <div className="text-right">
            <Row label="Issue date" value={formatDate(invoice.issueDate)} />
            <Row label="Due date" value={formatDate(invoice.dueDate)} />
            <Row label="Terms" value={`${c.paymentTerms} days`} />
            {company.vatNumber && <Row label="VAT no." value={company.vatNumber} />}
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead className="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="py-2 text-slate-700">{l.description}</td>
                <td className="py-2 text-right tnum text-slate-700">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td className="py-1.5 text-right font-medium text-slate-500">Subtotal</td>
              <td className="py-1.5 text-right tnum">{money(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-right font-medium text-slate-500">VAT</td>
              <td className="py-1.5 text-right tnum">{money(invoice.vat)}</td>
            </tr>
            <tr className="border-t-2 border-slate-300">
              <td className="py-2 text-right text-base font-semibold">Total due</td>
              <td className="py-2 text-right text-base font-semibold tnum">{money(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>

        {(company.bankName || company.sortCode) && (
          <div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Payment details — </span>
            {company.bankName}
            {company.sortCode ? ` · Sort code ${company.sortCode}` : ""}
            {company.accountNumber ? ` · Account ${company.accountNumber}` : ""}
            {company.companyReg ? ` · Company reg ${company.companyReg}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-end gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
