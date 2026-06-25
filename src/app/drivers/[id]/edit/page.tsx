import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { updateDriver } from "@/actions/drivers";
import { DriverForm } from "../../driver-form";

export const dynamic = "force-dynamic";

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [driver, vehicles] = await Promise.all([
    prisma.driver.findUnique({ where: { id } }),
    prisma.vehicle.findMany({ orderBy: { registration: "asc" } }),
  ]);
  if (!driver) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${driver.name}`} />
      <DriverForm action={updateDriver.bind(null, driver.id)} driver={driver} vehicles={vehicles} />
    </div>
  );
}
