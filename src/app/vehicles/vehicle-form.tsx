import { Vehicle } from "@prisma/client";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  vehicleStatuses,
  vehicleStatusLabels,
  vehicleTypes,
  vehicleTypeLabels,
} from "@/lib/format";

export function VehicleForm({
  action,
  vehicle,
}: {
  action: (formData: FormData) => void;
  vehicle?: Vehicle;
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration" required>
            <Input name="registration" defaultValue={vehicle?.registration ?? ""} required />
          </Field>
          <Field label="Type" required>
            <Select
              name="type"
              defaultValue={vehicle?.type ?? "SMALL_VAN"}
              options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))}
            />
          </Field>
          <Field label="Make">
            <Input name="make" defaultValue={vehicle?.make ?? ""} />
          </Field>
          <Field label="Model">
            <Input name="model" defaultValue={vehicle?.model ?? ""} />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={vehicle?.status ?? "ACTIVE"}
              options={vehicleStatuses.map((s) => ({ value: s, label: vehicleStatusLabels[s] }))}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <Textarea name="notes" rows={2} defaultValue={vehicle?.notes ?? ""} />
          </Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit">{vehicle ? "Save changes" : "Create vehicle"}</Button>
      </div>
    </form>
  );
}
