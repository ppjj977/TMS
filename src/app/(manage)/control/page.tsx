import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import {
  Card,
  EmptyState,
  JobStatusBadge,
  LinkButton,
  PageHeader,
  Table,
  TBody,
  THead,
  Th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDateTime, money, serviceLevelLabels, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

// Built-in default view shown when no saved screen is selected.
const DEFAULT_STATUSES: JobStatus[] = [
  JobStatus.BOOKED,
  JobStatus.ALLOCATED,
  JobStatus.ON_ROUTE,
];

export default async function ControlRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  const { screen: screenId } = await searchParams;

  const screens = await prisma.trafficScreen.findMany({
    orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
  });
  const screen = screenId ? screens.find((s) => s.id === screenId) : undefined;

  const where: Prisma.JobWhereInput = {};
  if (screen) {
    if (screen.statuses.length) where.status = { in: screen.statuses };
    if (screen.serviceLevels.length) where.serviceLevel = { in: screen.serviceLevels };
    if (screen.vehicleType) where.vehicleType = screen.vehicleType;
  } else {
    where.status = { in: DEFAULT_STATUSES };
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { customer: true, driver: true, _count: { select: { stops: true } } },
    orderBy: { serviceDate: "asc" },
    take: 300,
  });

  const tab = (id: string | undefined, label: string) => {
    const active = (id ?? "") === (screenId ?? "");
    return (
      <Link
        key={id ?? "default"}
        href={id ? `/control?screen=${id}` : "/control"}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-brand-600 text-white shadow-sm"
            : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        title="Control Room"
        subtitle="Live job board — filtered by your saved views"
        action={
          <LinkButton href="/control/screens" variant="secondary">
            <Icon name="control" size={16} /> Manage views
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab(undefined, "Active")}
        {screens.map((s) => tab(s.id, s.name))}
      </div>

      {jobs.length === 0 ? (
        <EmptyState message="No jobs match this view." icon={<Icon name="control" size={18} />} />
      ) : (
        <Card>
          <Table>
            <THead>
              <Th>Reference</Th>
              <Th>Service</Th>
              <Th>Customer</Th>
              <Th>Vehicle</Th>
              <Th>Driver</Th>
              <Th right>Quote</Th>
              <Th right>Cost</Th>
              <Th right>Profit</Th>
              <Th>Status</Th>
            </THead>
            <TBody>
              {jobs.map((job) => {
                const profit = job.customerCharge - job.driverCost;
                const pct = job.customerCharge > 0 ? (profit / job.customerCharge) * 100 : 0;
                return (
                  <tr key={job.id} className="transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:text-brand-700">
                        {job.reference}
                      </Link>
                      <div className="text-xs text-slate-400">{formatDateTime(job.serviceDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{serviceLevelLabels[job.serviceLevel]}</td>
                    <td className="px-4 py-3 text-slate-700">{job.customer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{vehicleTypeLabels[job.vehicleType]}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {job.driver?.name ?? <span className="text-amber-600">Unallocated</span>}
                    </td>
                    <td className="px-4 py-3 text-right tnum text-slate-700">{money(job.customerCharge)}</td>
                    <td className="px-4 py-3 text-right tnum text-slate-500">{money(job.driverCost)}</td>
                    <td className={`px-4 py-3 text-right tnum font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {money(profit)}
                      <span className="ml-1 text-xs font-normal text-slate-400">{pct.toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
