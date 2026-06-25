import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { updateRateCard } from "@/actions/rate-cards";
import { RateCardForm } from "../../rate-card-form";

export const dynamic = "force-dynamic";

export default async function EditRateCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [card, customers, drivers] = await Promise.all([
    prisma.rateCard.findUnique({ where: { id }, include: { bands: true } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!card) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${card.name}`} />
      <RateCardForm
        action={updateRateCard.bind(null, card.id)}
        card={card}
        customers={customers}
        drivers={drivers}
      />
    </div>
  );
}
