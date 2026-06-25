import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { createRateCard } from "@/actions/rate-cards";
import { RateCardForm } from "../rate-card-form";

export const dynamic = "force-dynamic";

export default async function NewRateCardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; customerId?: string; driverId?: string }>;
}) {
  const defaults = await searchParams;
  const [customers, drivers] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader title="New rate card" />
      <RateCardForm
        action={createRateCard}
        customers={customers}
        drivers={drivers}
        defaults={defaults}
      />
    </div>
  );
}
