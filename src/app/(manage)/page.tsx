import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import {
  Card,
  EmptyState,
  JobStatusBadge,
  PageHeader,
  Stat,
  Table,
  TBody,
  THead,
  Th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, jobStatusLabels, money, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

const breakdownOrder: JobStatus[] = [
  JobStatus.BOOKED,
  JobStatus.ALLOCATED,
  JobStatus.ON_ROUTE,
  JobStatus.COMPLETED,
  JobStatus.INVOICED,
  JobStatus.CANCELLED,
];

const barColor: Record<JobStatus, string> = {
  BOOKED: "bg-slate-400",
  ALLOCATED: "bg-blue-500",
  ON_ROUTE: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  INVOICED: "bg-violet-500",
  CANCELLED: "bg-red-400",
};

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
  const totalJobs = statusCounts.reduce((sum, c) => sum + c._count._all, 0);

  const revenue = revenueAgg._sum.customerCharge ?? 0;
  const cost = revenueAgg._sum.driverCost ?? 0;
  const margin = revenue - cost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="Operations dashboard"
        subtitle={`Today — ${formatDate(today)}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Unallocated" value={unallocated} hint="Awaiting a driver" icon={<Icon name="allocation" size={18} />} accent="amber" />
        <Stat label="On route" value={countFor(JobStatus.ON_ROUTE)} hint="Live now" icon={<Icon name="route" size={18} />} accent="brand" />
        <Stat label="Today revenue" value={money(revenue)} hint={`Cost ${money(cost)}`} icon={<Icon name="pound" size={18} />} accent="green" />
        <Stat label="Today margin" value={money(margin)} hint={`${marginPct.toFixed(1)}% of revenue`} icon={<Icon name="invoices" size={18} />} accent="slate" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Jobs table */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Today&apos;s jobs</h2>
            <Link href="/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              All bookings <Icon name="chevronRight" size={14} />
            </Link>
          </div>

          {todays.length === 0 ? (
            <EmptyState message="No jobs scheduled for today yet." icon={<Icon name="bookings" size={18} />} />
          ) : (
            <Card>
              <Table>
                <THead>
                  <Th>Reference</Th>
                  <Th>Customer</Th>
                  <Th>Vehicle</Th>
                  <Th>Driver</Th>
                  <Th right>Charge</Th>
                  <Th>Status</Th>
                </THead>
                <TBody>
                  {todays.map((job) => (
                    <tr key={job.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:text-brand-700">
                          {job.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{job.customer.name}</td>
                      <td className="px-4 py-3 text-slate-600">{vehicleTypeLabels[job.vehicleType]}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {job.driver?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tnum text-slate-700">{money(job.customerCharge)}</td>
                      <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Status breakdown */}
        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">Pipeline</h2>
          <Card className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-slate-500">All jobs</span>
              <span className="text-2xl font-semibold tracking-tight text-slate-900 tnum">{totalJobs}</span>
            </div>
            <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-slate-100">
              {breakdownOrder.map((s) => {
                const c = countFor(s);
                if (!c || !totalJobs) return null;
                return <span key={s} className={barColor[s]} style={{ width: `${(c / totalJobs) * 100}%` }} />;
              })}
            </div>
            <ul className="space-y-2">
              {breakdownOrder.map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${barColor[s]}`} />
                    {jobStatusLabels[s]}
                  </span>
                  <span className="tnum font-medium text-slate-900">{countFor(s)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
