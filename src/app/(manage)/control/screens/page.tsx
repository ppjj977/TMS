import { prisma } from "@/lib/prisma";
import { createScreen, deleteScreen } from "@/actions/traffic";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import {
  jobStatuses,
  jobStatusLabels,
  serviceLevels,
  serviceLevelLabels,
  vehicleTypes,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TrafficScreensPage() {
  const screens = await prisma.trafficScreen.findMany({
    orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Control Room views"
        subtitle="Saved filtered board views, like Navigator's traffic screens"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Your views</h2>
          {screens.length === 0 ? (
            <EmptyState message="No saved views yet — create one to get started." />
          ) : (
            <div className="space-y-3">
              {screens.map((s) => (
                <Card key={s.id} className="flex items-start justify-between p-4">
                  <div>
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.statuses.length
                        ? s.statuses.map((st) => jobStatusLabels[st]).join(", ")
                        : "Any status"}
                      {s.serviceLevels.length
                        ? ` · ${s.serviceLevels.map((sl) => serviceLevelLabels[sl]).join(", ")}`
                        : ""}
                      {s.vehicleType ? ` · ${vehicleTypeLabels[s.vehicleType]}` : ""}
                    </div>
                  </div>
                  <form action={deleteScreen.bind(null, s.id)}>
                    <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">New view</h2>
          <Card className="p-5">
            <form action={createScreen} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="View name" required>
                  <Input name="name" placeholder="e.g. Unallocated same-day" required />
                </Field>
                <Field label="Menu order">
                  <Input type="number" name="orderIndex" defaultValue={0} />
                </Field>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Statuses</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {jobStatuses.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" name="statuses" value={s} className="rounded border-slate-300" />
                      {jobStatusLabels[s]}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">Leave all unticked to match any status.</p>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Service levels</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {serviceLevels.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-600">
                      <input type="checkbox" name="serviceLevels" value={s} className="rounded border-slate-300" />
                      {serviceLevelLabels[s]}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Vehicle type">
                <Select
                  name="vehicleType"
                  defaultValue=""
                  options={[
                    { value: "", label: "Any vehicle type" },
                    ...vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] })),
                  ]}
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit">Create view</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
