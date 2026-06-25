import { PageHeader } from "@/components/ui";
import { createVehicle } from "@/actions/vehicles";
import { VehicleForm } from "../vehicle-form";

export default function NewVehiclePage() {
  return (
    <div>
      <PageHeader title="New vehicle" />
      <VehicleForm action={createVehicle} />
    </div>
  );
}
