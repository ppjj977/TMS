import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  TBody,
  THead,
  Th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, money, quoteStatusLabels, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

const color: Record<string, "gray" | "blue" | "green" | "amber"> = {
  DRAFT: "gray",
  SENT: "blue",
  CONVERTED: "green",
  EXPIRED: "amber",
};

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Instant pricing you can save and convert to bookings"
        action={<LinkButton href="/quotes/new"><Icon name="plus" size={16} /> New quote</LinkButton>}
      />

      {quotes.length === 0 ? (
        <EmptyState message="No quotes yet. Create one to price a job instantly." icon={<Icon name="pound" size={18} />} />
      ) : (
        <Card>
          <Table>
            <THead>
              <Th>Reference</Th>
              <Th>Customer</Th>
              <Th>Vehicle</Th>
              <Th>Route</Th>
              <Th right>Price</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </THead>
            <TBody>
              {quotes.map((q) => (
                <tr key={q.id} className="transition hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    <Link href={`/quotes/${q.id}`} className="text-brand-600 hover:text-brand-700">
                      {q.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {q.customer?.name ?? q.customerName ?? <span className="text-slate-400">Ad-hoc</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{vehicleTypeLabels[q.vehicleType]}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {q.collectionPostcode ?? "?"} → {q.deliveryPostcode ?? "?"}
                  </td>
                  <td className="px-4 py-3 text-right tnum text-slate-700">{money(q.amount)}</td>
                  <td className="px-4 py-3"><Badge color={color[q.status]} withDot>{quoteStatusLabels[q.status]}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
