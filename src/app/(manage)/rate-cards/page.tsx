import { prisma } from "@/lib/prisma";
import { deleteRateCard } from "@/actions/rate-cards";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import {
  dayTypeLabels,
  money,
  rateCardKindLabels,
  timeBandLabels,
  vehicleTypeLabels,
} from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RateCardsPage() {
  const cards = await prisma.rateCard.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { customer: true, driver: true },
  });

  const customerCards = cards.filter((c) => c.kind === "CUSTOMER");
  const driverCards = cards.filter((c) => c.kind === "DRIVER");

  return (
    <div>
      <PageHeader
        title="Rate cards"
        subtitle="Pricing rules — most specific match wins (owner › vehicle › day › time)"
        action={<LinkButton href="/rate-cards/new">+ New rate card</LinkButton>}
      />

      <Section title="Customer rates (revenue)" cards={customerCards} ownerLabel="Customer" />
      <div className="h-8" />
      <Section title="Driver rates (cost)" cards={driverCards} ownerLabel="Driver" />
    </div>
  );
}

function Section({
  title,
  cards,
  ownerLabel,
}: {
  title: string;
  cards: Awaited<ReturnType<typeof getCardsType>>;
  ownerLabel: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      {cards.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} defined yet.`} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">{ownerLabel}</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Per mile</th>
                  <th className="px-4 py-3">Minimum</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/rate-cards/${c.id}/edit`} className="text-brand-600 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.customer?.name ?? c.driver?.name ?? <span className="text-gray-400">default</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.vehicleType ? vehicleTypeLabels[c.vehicleType] : <span className="text-gray-400">any</span>}
                    </td>
                    <td className="px-4 py-3">{dayTypeLabels[c.dayType]}</td>
                    <td className="px-4 py-3">{timeBandLabels[c.timeBand]}</td>
                    <td className="px-4 py-3">{money(c.ratePerMile)}</td>
                    <td className="px-4 py-3">{money(c.minimumCharge)}</td>
                    <td className="px-4 py-3">
                      {c.active ? <Badge color="green">Active</Badge> : <Badge color="gray">Off</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={deleteRateCard.bind(null, c.id)}>
                        <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </form>
                    </td>
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

// Helper purely for the Section prop type.
async function getCardsType() {
  return prisma.rateCard.findMany({ include: { customer: true, driver: true } });
}
