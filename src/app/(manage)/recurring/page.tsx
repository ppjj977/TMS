import { prisma } from "@/lib/prisma";
import { deleteRecurring, generateNow, toggleRecurring } from "@/actions/recurring";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { vehicleTypeLabels } from "@/lib/format";
import { RecurringForm } from "./recurring-form";

export const dynamic = "force-dynamic";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ generated?: string }>;
}) {
  const { generated } = await searchParams;
  const [templates, customers] = await Promise.all([
    prisma.recurringJob.findMany({
      include: { customer: true, _count: { select: { stops: true, jobs: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Recurring jobs"
        subtitle="Standing jobs that generate bookings on a weekly schedule"
        action={
          <form action={generateNow}>
            <Button type="submit">Generate due (next 7 days)</Button>
          </form>
        }
      />

      {generated !== undefined && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Generated {generated} booking(s) from due standing jobs.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Templates</h2>
          {templates.length === 0 ? (
            <EmptyState message="No standing jobs yet." />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{t.name}</span>
                        {t.active ? <Badge color="green">Active</Badge> : <Badge color="gray">Paused</Badge>}
                      </div>
                      <div className="text-sm text-slate-600">{t.customer.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {vehicleTypeLabels[t.vehicleType]} · {t._count.stops} stops ·{" "}
                        {String(t.startHour).padStart(2, "0")}:{String(t.startMinute).padStart(2, "0")} ·{" "}
                        {DAY_KEYS.filter((d) => (t as any)[d]).map((d) => DAY_LABEL[d]).join(" ") || "no days set"} ·{" "}
                        {t._count.jobs} generated
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <form action={toggleRecurring.bind(null, t.id, !t.active)}>
                        <button className="text-xs font-medium text-brand-600 hover:underline">
                          {t.active ? "Pause" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteRecurring.bind(null, t.id)}>
                        <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </form>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          {customers.length === 0 ? (
            <EmptyState message="Add an active customer first." />
          ) : (
            <RecurringForm customers={customers} />
          )}
        </div>
      </div>
    </div>
  );
}
