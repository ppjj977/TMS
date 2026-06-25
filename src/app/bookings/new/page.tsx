import { prisma } from "@/lib/prisma";
import { PageHeader, EmptyState, LinkButton } from "@/components/ui";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
    },
  });

  return (
    <div>
      <PageHeader title="New booking" subtitle="Create a same-day multi-drop job" />
      {customers.length === 0 ? (
        <EmptyState message="You need at least one active customer before booking a job." />
      ) : (
        <BookingForm
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            contacts: c.contacts.map((ct) => ({ id: ct.id, name: ct.name })),
          }))}
        />
      )}
      <div className="mt-4">
        <LinkButton href="/customers/new" variant="secondary">
          + Add a customer
        </LinkButton>
      </div>
    </div>
  );
}
