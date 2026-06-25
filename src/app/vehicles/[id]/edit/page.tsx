import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { updateVehicle } from "@/actions/vehicles";
import { VehicleForm } from "../../vehicle-form";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${vehicle.registration}`} />
      <VehicleForm action={updateVehicle.bind(null, vehicle.id)} vehicle={vehicle} />
    </div>
  );
}
