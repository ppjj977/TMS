import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { allocateJob } from "@/actions/bookings";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  JobStatusBadge,
  PageHeader,
  Select,
} from "@/components/ui";
import { formatDate, money, vehicleTypeLabels } from "@/lib/format";
import { computeItinerary, resolveProfile, RouteProfile } from "@/lib/routing";

export const dynamic = "force-dynamic";

const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export default async function AllocationPage() {
  const [unallocated, drivers, activeJobs, profiles] = await Promise.all([
    prisma.job.findMany({
      where: { status: JobStatus.BOOKED },
      include: {
        customer: true,
        stops: { orderBy: { sequence: "asc" } },
        _count: { select: { stops: true } },
      },
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
    prisma.vehicleTypeProfile.findMany(),
  ]);

  const profileMap = new Map<string, RouteProfile>(
    profiles.map((p) => [
      p.type,
      { urbanSpeedMph: p.urbanSpeedMph, motorwaySpeedMph: p.motorwaySpeedMph, dwellMin: p.dwellMin },
    ]),
  );

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
        subtitle="Assign unallocated jobs to drivers, with live timing in view"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unallocated queue */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Unallocated <span className="text-sm font-normal text-slate-400">({unallocated.length})</span>
          </h2>
          {unallocated.length === 0 ? (
            <EmptyState message="Everything is allocated. 🎉" />
          ) : (
            <div className="space-y-3">
              {unallocated.map((job) => {
                const itin = computeItinerary(
                  job.stops.map((s) => ({
                    lat: s.latitude,
                    lng: s.longitude,
                    requested: s.windowFrom,
                    deadline: s.windowTo,
                  })),
                  job.serviceDate,
                  resolveProfile(profileMap.get(job.vehicleType)),
                );
                const finish = itin.legs[itin.legs.length - 1]?.arrival ?? null;
                return (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/bookings/${job.id}`} className="font-medium text-brand-600 hover:underline">
                            {job.reference}
                          </Link>
                          {job.deadlineRisk && <Badge color="red">⚠ Deadline risk</Badge>}
                        </div>
                        <div className="text-sm text-slate-600">{job.customer.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(job.serviceDate)} · {vehicleTypeLabels[job.vehicleType]} ·{" "}
                          {job._count.stops} stops · {money(job.customerCharge)}
                        </div>
                      </div>
                    </div>

                    {/* Live ETAs */}
                    {itin.totalMiles > 0 && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                          <span>Route ETAs</span>
                          <span className="tnum">
                            {itin.totalMiles} mi · ends {fmtTime(finish)}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {job.stops.map((s, i) => {
                            const leg = itin.legs[i];
                            return (
                              <li key={s.id} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">
                                  {i + 1}. {s.type === "COLLECTION" ? "Collect" : "Deliver"} {s.postcode}
                                </span>
                                <span className={`tnum ${leg?.late ? "font-medium text-red-600" : "text-slate-500"}`}>
                                  {fmtTime(leg?.arrival ?? null)}
                                  {leg?.late ? ` (+${leg.lateMin}m)` : ""}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <form action={allocateJob.bind(null, job.id)} className="mt-3 flex items-end gap-2">
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
                );
              })}
            </div>
          )}
        </div>

        {/* Driver workload */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Driver workload</h2>
          <div className="space-y-3">
            {drivers.map((driver) => {
              const jobs = byDriver.get(driver.id) ?? [];
              return (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{driver.name}</div>
                      <div className="text-xs text-slate-500">
                        {driver.defaultVehicle
                          ? `${driver.defaultVehicle.registration} · ${vehicleTypeLabels[driver.defaultVehicle.type]}`
                          : "No default vehicle"}
                      </div>
                    </div>
                    <span className="text-sm text-slate-500">{jobs.length} active</span>
                  </div>
                  {jobs.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {jobs.map((job) => (
                        <li key={job.id} className="flex items-center justify-between gap-2 text-sm">
                          <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                            {job.reference}
                          </Link>
                          <span className="flex-1 truncate text-slate-500">{job.customer.name}</span>
                          {job.deadlineRisk && <Badge color="red">⚠</Badge>}
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
