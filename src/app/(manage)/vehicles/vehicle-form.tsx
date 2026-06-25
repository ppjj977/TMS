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

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Routing overrides</h2>
        <p className="mb-4 text-sm text-slate-500">
          Optional — leave blank to use the vehicle type&apos;s default speeds. Used to estimate
          ETAs when this vehicle is allocated.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Urban speed (mph)">
            <Input type="number" step="1" min="1" name="urbanSpeedMph" defaultValue={vehicle?.urbanSpeedMph ?? ""} placeholder="inherit" />
          </Field>
          <Field label="Motorway speed (mph)">
            <Input type="number" step="1" min="1" name="motorwaySpeedMph" defaultValue={vehicle?.motorwaySpeedMph ?? ""} placeholder="inherit" />
          </Field>
          <Field label="Dwell per stop (min)">
            <Input type="number" step="1" min="0" name="dwellMin" defaultValue={vehicle?.dwellMin ?? ""} placeholder="inherit" />
          </Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit">{vehicle ? "Save changes" : "Create vehicle"}</Button>
      </div>
    </form>
  );
}
