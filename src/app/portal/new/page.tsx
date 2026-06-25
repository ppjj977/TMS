import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PortalBookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function PortalNewBookingPage() {
  const user = await getCurrentUser();
  if (!user?.customerId) redirect("/login");

  const addresses = await prisma.savedAddress.findMany({
    where: { customerId: user.customerId },
    orderBy: { label: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="New booking"
        subtitle="We'll confirm by email and price it against your account rates"
      />
      <PortalBookingForm
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          name: a.name,
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2,
          city: a.city,
          postcode: a.postcode,
          contactName: a.contactName,
          contactPhone: a.contactPhone,
        }))}
      />
    </div>
  );
}
