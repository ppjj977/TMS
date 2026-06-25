import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { QuoteForm } from "../quote-form";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New quote" subtitle="Price a job from your rate cards" />
      <QuoteForm customers={customers} />
    </div>
  );
}
