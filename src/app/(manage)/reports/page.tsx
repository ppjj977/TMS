import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { Card, PageHeader, Stat, Table, TBody, THead, Th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { jobStatusLabels, money, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const today = new Date();
  const toDate = to ? new Date(to) : today;
  const fromDate = from ? new Date(from) : new Date(today.getTime() - 29 * 86400000);
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);

  const inRange = { serviceDate: { gte: start, lt: end } };
  const billable = { ...inRange, status: { not: JobStatus.CANCELLED } };

  const [agg, statusCounts, vehicleMix, custGroups, driverGroups, slaStops, trendJobs, customers, drivers] =
    await Promise.all([
      prisma.job.aggregate({ where: billable, _sum: { customerCharge: true, driverCost: true }, _count: { _all: true } }),
      prisma.job.groupBy({ by: ["status"], where: inRange, _count: { _all: true } }),
      prisma.job.groupBy({ by: ["vehicleType"], where: billable, _count: { _all: true }, _sum: { customerCharge: true } }),
      prisma.job.groupBy({ by: ["customerId"], where: billable, _count: { _all: true }, _sum: { customerCharge: true } }),
      prisma.job.groupBy({ by: ["driverId"], where: { ...billable, driverId: { not: null } }, _count: { _all: true }, _sum: { driverCost: true } }),
      prisma.stop.findMany({
        where: { completedAt: { not: null }, windowTo: { not: null }, job: { is: inRange } },
        select: { windowTo: true, completedAt: true, job: { select: { driverId: true } } },
      }),
      prisma.job.findMany({ where: billable, select: { serviceDate: true, customerCharge: true } }),
      prisma.customer.findMany({ select: { id: true, name: true } }),
      prisma.driver.findMany({ select: { id: true, name: true } }),
    ]);

  const revenue = agg._sum.customerCharge ?? 0;
  const cost = agg._sum.driverCost ?? 0;
  const margin = revenue - cost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

  // On-time SLA (stop level + per driver).
  const onTime = slaStops.filter((s) => s.completedAt! <= s.windowTo!).length;
  const slaPct = slaStops.length > 0 ? (onTime / slaStops.length) * 100 : 0;
  const driverSla = new Map<string, { ok: number; total: number }>();
  for (const s of slaStops) {
    const id = s.job.driverId;
    if (!id) continue;
    const e = driverSla.get(id) ?? { ok: 0, total: 0 };
    e.total++;
    if (s.completedAt! <= s.windowTo!) e.ok++;
    driverSla.set(id, e);
  }

  const customerName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";
  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? "—";

  const topCustomers = [...custGroups]
    .sort((a, b) => (b._sum.customerCharge ?? 0) - (a._sum.customerCharge ?? 0))
    .slice(0, 8);
  const topDrivers = [...driverGroups]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8);

  // Daily revenue trend.
  const byDay = new Map<string, number>();
  for (const j of trendJobs) byDay.set(isoDay(j.serviceDate), (byDay.get(isoDay(j.serviceDate)) ?? 0) + j.customerCharge);
  const days: { day: string; total: number }[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86400000) {
    const key = isoDay(new Date(t));
    days.push({ day: key, total: byDay.get(key) ?? 0 });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  const countFor = (s: JobStatus) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div>
      <PageHeader title="Reports" subtitle={`${isoDay(start)} → ${isoDay(new Date(end.getTime() - 1))}`} />

      <form className="mb-6 flex flex-wrap items-end gap-3" action="/reports">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">From</span>
          <input type="date" name="from" defaultValue={isoDay(start)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:shadow-focus" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">To</span>
          <input type="date" name="to" defaultValue={isoDay(new Date(end.getTime() - 1))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:shadow-focus" />
        </label>
        <button className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
      </form>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Revenue" value={money(revenue)} icon={<Icon name="pound" size={18} />} accent="green" />
        <Stat label="Driver cost" value={money(cost)} accent="slate" />
        <Stat label="Margin" value={money(margin)} hint={`${marginPct.toFixed(1)}%`} icon={<Icon name="invoices" size={18} />} accent="brand" />
        <Stat label="Jobs" value={agg._count._all} accent="slate" />
        <Stat label="On-time" value={`${slaPct.toFixed(0)}%`} hint={`${onTime}/${slaStops.length} stops`} icon={<Icon name="clock" size={18} />} accent={slaPct >= 95 ? "green" : "amber"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Daily revenue</h2>
          <Card className="p-5">
            <div className="flex h-40 items-end gap-1">
              {days.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${money(d.total)}`}>
                  <div className="w-full rounded-t bg-brand-500/80 transition group-hover:bg-brand-600" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total > 0 ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{days[0]?.day}</span>
              <span>peak {money(maxDay)}</span>
              <span>{days[days.length - 1]?.day}</span>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">By status</h2>
          <Card className="p-5">
            <ul className="space-y-2 text-sm">
              {(Object.keys(jobStatusLabels) as JobStatus[]).map((s) => (
                <li key={s} className="flex justify-between">
                  <span className="text-slate-600">{jobStatusLabels[s]}</span>
                  <span className="tnum font-medium text-slate-900">{countFor(s)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Top customers</h2>
          <Card>
            <Table>
              <THead><Th>Customer</Th><Th right>Jobs</Th><Th right>Revenue</Th></THead>
              <TBody>
                {topCustomers.map((c) => (
                  <tr key={c.customerId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-slate-700">{customerName(c.customerId)}</td>
                    <td className="px-4 py-2.5 text-right tnum text-slate-600">{c._count._all}</td>
                    <td className="px-4 py-2.5 text-right tnum font-medium text-slate-900">{money(c._sum.customerCharge ?? 0)}</td>
                  </tr>
                ))}
                {topCustomers.length === 0 && <tr><td className="px-4 py-3 text-sm text-slate-400" colSpan={3}>No data in range.</td></tr>}
              </TBody>
            </Table>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Vehicle mix</h2>
          <Card className="p-5">
            <ul className="space-y-2 text-sm">
              {vehicleMix.sort((a, b) => b._count._all - a._count._all).map((v) => (
                <li key={v.vehicleType} className="flex justify-between">
                  <span className="text-slate-600">{vehicleTypeLabels[v.vehicleType]}</span>
                  <span className="tnum text-slate-900">{v._count._all} · {money(v._sum.customerCharge ?? 0)}</span>
                </li>
              ))}
              {vehicleMix.length === 0 && <li className="text-slate-400">No data in range.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Driver performance</h2>
        <Card>
          <Table>
            <THead><Th>Driver</Th><Th right>Jobs</Th><Th right>Cost</Th><Th right>On-time</Th></THead>
            <TBody>
              {topDrivers.map((d) => {
                const sla = driverSla.get(d.driverId as string);
                const pct = sla && sla.total > 0 ? (sla.ok / sla.total) * 100 : null;
                return (
                  <tr key={d.driverId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-slate-700">{driverName(d.driverId)}</td>
                    <td className="px-4 py-2.5 text-right tnum text-slate-600">{d._count._all}</td>
                    <td className="px-4 py-2.5 text-right tnum text-slate-600">{money(d._sum.driverCost ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right tnum font-medium text-slate-900">
                      {pct == null ? "—" : `${pct.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
              {topDrivers.length === 0 && <tr><td className="px-4 py-3 text-sm text-slate-400" colSpan={4}>No allocated jobs in range.</td></tr>}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
