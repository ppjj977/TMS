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
      savedAddresses: { orderBy: { label: "asc" } },
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
            savedAddresses: c.savedAddresses.map((a) => ({
              id: a.id,
              label: a.label,
              name: a.name,
              addressLine1: a.addressLine1,
              addressLine2: a.addressLine2,
              city: a.city,
              postcode: a.postcode,
              contactName: a.contactName,
              contactPhone: a.contactPhone,
              latitude: a.latitude,
              longitude: a.longitude,
            })),
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
