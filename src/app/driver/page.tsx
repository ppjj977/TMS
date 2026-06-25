import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { JobStatus, StopStatus } from "@prisma/client";
import { EmptyState, JobStatusBadge } from "@/components/ui";
import { formatDate, serviceLevelLabels, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriverHomePage() {
  const user = await getCurrentUser();
  if (!user?.driverId) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: {
      driverId: user.driverId,
      status: { in: [JobStatus.ALLOCATED, JobStatus.ON_ROUTE] },
    },
    include: { customer: true, stops: { orderBy: { sequence: "asc" } } },
    orderBy: { serviceDate: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">My jobs</h1>
      <p className="mb-4 text-sm text-gray-500">{jobs.length} active</p>

      {jobs.length === 0 ? (
        <EmptyState message="No jobs allocated to you right now." />
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const done = job.stops.filter(
              (s) => s.status === StopStatus.COMPLETED || s.status === StopStatus.FAILED,
            ).length;
            return (
              <li key={job.id}>
                <Link
                  href={`/driver/${job.id}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm active:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{job.reference}</span>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <div className="mt-1 text-sm text-gray-600">{job.customer.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDate(job.serviceDate)} · {serviceLevelLabels[job.serviceLevel]} ·{" "}
                    {vehicleTypeLabels[job.vehicleType]}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-brand-600">
                      {done}/{job.stops.length} stops done →
                    </span>
                    {job.deadlineRisk && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
                        ⚠ Tight deadline
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
