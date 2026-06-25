import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, miles, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const day = date ? new Date(date) : new Date();
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateStr = start.toISOString().slice(0, 10);

  const drivers = await prisma.driver.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      defaultVehicle: true,
      jobs: {
        where: {
          serviceDate: { gte: start, lt: end },
          status: { notIn: [JobStatus.CANCELLED] },
        },
        include: { _count: { select: { stops: true } } },
      },
    },
  });

  const withWork = drivers.filter((d) => d.jobs.length > 0);

  return (
    <div>
      <PageHeader title="Run sheets" subtitle={`Driver manifests for ${formatDate(day)}`} />

      <form className="mb-4" action="/runs">
        <input
          type="date"
          name="date"
          defaultValue={dateStr}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:shadow-focus"
        />
      </form>

      {withWork.length === 0 ? (
        <EmptyState message="No drivers have jobs on this date." icon={<Icon name="drivers" size={18} />} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withWork.map((d) => {
            const stops = d.jobs.reduce((n, j) => n + j._count.stops, 0);
            const mi = d.jobs.reduce((n, j) => n + j.distanceMiles, 0);
            return (
              <Card key={d.id} className="p-4">
                <div className="font-medium text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-500">
                  {d.defaultVehicle
                    ? `${d.defaultVehicle.registration} · ${vehicleTypeLabels[d.defaultVehicle.type]}`
                    : "No default vehicle"}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {d.jobs.length} jobs · {stops} stops · {miles(mi)}
                </div>
                <Link
                  href={`/run/${d.id}?date=${dateStr}`}
                  target="_blank"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Icon name="invoices" size={14} /> Open run sheet
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
