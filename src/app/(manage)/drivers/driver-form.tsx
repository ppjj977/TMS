import { Driver, Vehicle } from "@prisma/client";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { driverStatuses, driverStatusLabels, vehicleTypeLabels } from "@/lib/format";

export function DriverForm({
  action,
  driver,
  vehicles,
}: {
  action: (formData: FormData) => void;
  driver?: Driver;
  vehicles: Vehicle[];
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <Input name="name" defaultValue={driver?.name ?? ""} required />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={driver?.status ?? "ACTIVE"}
              options={driverStatuses.map((s) => ({ value: s, label: driverStatusLabels[s] }))}
            />
          </Field>
          <Field label="Email">
            <Input type="email" name="email" defaultValue={driver?.email ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={driver?.phone ?? ""} />
          </Field>
          <Field label="Licence number">
            <Input name="licenceNumber" defaultValue={driver?.licenceNumber ?? ""} />
          </Field>
          <Field label="Default vehicle">
            <Select
              name="defaultVehicleId"
              defaultValue={driver?.defaultVehicleId ?? ""}
              options={[
                { value: "", label: "— none —" },
                ...vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.registration} (${vehicleTypeLabels[v.type]})`,
                })),
              ]}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <Textarea name="notes" rows={2} defaultValue={driver?.notes ?? ""} />
          </Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit">{driver ? "Save changes" : "Create driver"}</Button>
      </div>
    </form>
  );
}
