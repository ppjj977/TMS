import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { createDriver } from "@/actions/drivers";
import { DriverForm } from "../driver-form";

export const dynamic = "force-dynamic";

export default async function NewDriverPage() {
  const vehicles = await prisma.vehicle.findMany({ orderBy: { registration: "asc" } });
  return (
    <div>
      <PageHeader title="New driver" />
      <DriverForm action={createDriver} vehicles={vehicles} />
    </div>
  );
}
