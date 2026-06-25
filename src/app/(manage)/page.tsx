import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import {
  Card,
  EmptyState,
  JobStatusBadge,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";
import { formatDate, money, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [statusCounts, todays, unallocated, revenueAgg] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.job.findMany({
      where: { serviceDate: { gte: startOfDay, lt: endOfDay } },
      include: { customer: true, driver: true },
      orderBy: { serviceDate: "asc" },
    }),
    prisma.job.count({ where: { status: JobStatus.BOOKED } }),
    prisma.job.aggregate({
      where: { serviceDate: { gte: startOfDay, lt: endOfDay } },
      _sum: { customerCharge: true, driverCost: true },
    }),
  ]);

  const countFor = (s: JobStatus) =>
    statusCounts.find((c) => c.status === s)?._count._all ?? 0;

  const revenue = revenueAgg._sum.customerCharge ?? 0;
  const cost = revenueAgg._sum.driverCost ?? 0;
  const margin = revenue - cost;

  return (
    <div>
      <PageHeader
        title="Operations dashboard"
        subtitle={`Today — ${formatDate(today)}`}
        action={<LinkButton href="/bookings/new">+ New booking</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Unallocated" value={unallocated} hint="Awaiting a driver" />
        <Stat label="Allocated" value={countFor(JobStatus.ALLOCATED)} />
        <Stat label="On route" value={countFor(JobStatus.ON_ROUTE)} />
        <Stat label="Completed" value={countFor(JobStatus.COMPLETED)} />
        <Stat label="Today revenue" value={money(revenue)} hint={`Cost ${money(cost)}`} />
        <Stat label="Today margin" value={money(margin)} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s jobs</h2>
          <Link href="/bookings" className="text-sm font-medium text-brand-600 hover:underline">
            All bookings →
          </Link>
        </div>

        {todays.length === 0 ? (
          <EmptyState message="No jobs scheduled for today yet." />
        ) : (
          <Card>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todays.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                        {job.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{job.customer.name}</td>
                    <td className="px-4 py-3">{vehicleTypeLabels[job.vehicleType]}</td>
                    <td className="px-4 py-3">{job.driver?.name ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">{money(job.customerCharge)}</td>
                    <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
