import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus, Prisma } from "@prisma/client";
import {
  Card,
  EmptyState,
  JobStatusBadge,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import {
  formatDate,
  jobStatusLabels,
  jobStatuses,
  money,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const where: Prisma.JobWhereInput = {};
  if (status && jobStatuses.includes(status as JobStatus)) {
    where.status = status as JobStatus;
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { customerRef: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { customer: true, driver: true, _count: { select: { stops: true } } },
    orderBy: { serviceDate: "desc" },
    take: 200,
  });

  const tab = (s?: JobStatus) => {
    const active = (s ?? "") === (status ?? "");
    const href = s ? `/bookings?status=${s}` : "/bookings";
    return (
      <Link
        key={s ?? "all"}
        href={href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          active ? "bg-brand-600 text-white" : "bg-white text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        }`}
      >
        {s ? jobStatusLabels[s] : "All"}
      </Link>
    );
  };

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Same-day multi-drop jobs"
        action={<LinkButton href="/bookings/new">+ New booking</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab(undefined)}
        {jobStatuses.map((s) => tab(s))}
      </div>

      <form className="mb-4" action="/bookings">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search reference, customer, PO…"
          className="block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
        />
      </form>

      {jobs.length === 0 ? (
        <EmptyState message="No bookings match. Create one to get started." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Service date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Stops</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                        {job.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(job.serviceDate)}</td>
                    <td className="px-4 py-3">{job.customer.name}</td>
                    <td className="px-4 py-3">{vehicleTypeLabels[job.vehicleType]}</td>
                    <td className="px-4 py-3">{job._count.stops}</td>
                    <td className="px-4 py-3">{job.driver?.name ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-3">{money(job.customerCharge)}</td>
                    <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
