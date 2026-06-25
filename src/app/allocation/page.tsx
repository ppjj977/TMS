import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { allocateJob } from "@/actions/bookings";
import {
  Button,
  Card,
  EmptyState,
  JobStatusBadge,
  PageHeader,
  Select,
} from "@/components/ui";
import { formatDate, money, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const [unallocated, drivers, activeJobs] = await Promise.all([
    prisma.job.findMany({
      where: { status: JobStatus.BOOKED },
      include: { customer: true, _count: { select: { stops: true } } },
      orderBy: { serviceDate: "asc" },
    }),
    prisma.driver.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { defaultVehicle: true },
    }),
    prisma.job.findMany({
      where: { status: { in: [JobStatus.ALLOCATED, JobStatus.ON_ROUTE] } },
      include: { customer: true, driver: true },
      orderBy: { serviceDate: "asc" },
    }),
  ]);

  const byDriver = new Map<string, typeof activeJobs>();
  for (const job of activeJobs) {
    if (!job.driverId) continue;
    const list = byDriver.get(job.driverId) ?? [];
    list.push(job);
    byDriver.set(job.driverId, list);
  }

  return (
    <div>
      <PageHeader
        title="Allocation board"
        subtitle="Assign unallocated jobs to drivers and track live workload"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unallocated queue */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Unallocated <span className="text-sm font-normal text-gray-400">({unallocated.length})</span>
          </h2>
          {unallocated.length === 0 ? (
            <EmptyState message="Everything is allocated. 🎉" />
          ) : (
            <div className="space-y-3">
              {unallocated.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/bookings/${job.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {job.reference}
                      </Link>
                      <div className="text-sm text-gray-600">{job.customer.name}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDate(job.serviceDate)} · {vehicleTypeLabels[job.vehicleType]} ·{" "}
                        {job._count.stops} stops · {money(job.customerCharge)}
                      </div>
                    </div>
                  </div>
                  <form
                    action={allocateJob.bind(null, job.id)}
                    className="mt-3 flex items-end gap-2"
                  >
                    <Select
                      name="driverId"
                      className="flex-1"
                      options={[
                        { value: "", label: "Choose driver…" },
                        ...drivers.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                    />
                    <Button type="submit">Allocate</Button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Driver workload */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Driver workload</h2>
          <div className="space-y-3">
            {drivers.map((driver) => {
              const jobs = byDriver.get(driver.id) ?? [];
              return (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{driver.name}</div>
                      <div className="text-xs text-gray-500">
                        {driver.defaultVehicle
                          ? `${driver.defaultVehicle.registration} · ${vehicleTypeLabels[driver.defaultVehicle.type]}`
                          : "No default vehicle"}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{jobs.length} active</span>
                  </div>
                  {jobs.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {jobs.map((job) => (
                        <li key={job.id} className="flex items-center justify-between text-sm">
                          <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                            {job.reference}
                          </Link>
                          <span className="text-gray-500">{job.customer.name}</span>
                          <JobStatusBadge status={job.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
            {drivers.length === 0 && (
              <EmptyState message="No active drivers. Add drivers to allocate work." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
