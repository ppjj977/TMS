import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { RouteMap } from "@/components/route-map";
import {
  computeItinerary,
  DEFAULT_PROFILE,
  optimiseDayOrder,
  resolveProfile,
} from "@/lib/routing";
import { formatDate, miles, stopTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—");

export default async function DayPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { driverId } = await params;
  const { date } = await searchParams;
  const day = date ? new Date(date) : new Date();
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 86400000);
  const dateStr = start.toISOString().slice(0, 10);

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      defaultVehicle: true,
      jobs: {
        where: { serviceDate: { gte: start, lt: end }, status: { notIn: [JobStatus.CANCELLED] } },
        include: { customer: true, stops: { orderBy: { sequence: "asc" } } },
        orderBy: { serviceDate: "asc" },
      },
    },
  });
  if (!driver) notFound();

  const typeProfile = driver.defaultVehicle
    ? await prisma.vehicleTypeProfile.findUnique({ where: { type: driver.defaultVehicle.type } })
    : null;
  const profile = driver.defaultVehicle
    ? resolveProfile(typeProfile, driver.defaultVehicle)
    : DEFAULT_PROFILE;

  // Flatten all stops, optimise the day order, then compute combined ETAs.
  const allStops = driver.jobs.flatMap((job) =>
    job.stops.map((s) => ({
      jobId: job.id,
      ref: job.reference,
      customer: job.customer.name,
      type: s.type as "COLLECTION" | "DELIVERY",
      lat: s.latitude,
      lng: s.longitude,
      postcode: s.postcode,
      name: s.name,
      deadline: s.windowTo,
      order: job.serviceDate.getTime(),
    })),
  );
  const ordered = optimiseDayOrder(allStops);
  const dayStart = driver.jobs[0]?.serviceDate ?? start;
  const itin = computeItinerary(
    ordered.map((s) => ({ lat: s.lat, lng: s.lng, deadline: s.deadline })),
    dayStart,
    profile,
  );
  const mapPoints = ordered
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      lat: s.lat as number,
      lng: s.lng as number,
      type: s.type,
      seq: s.i + 1,
      late: itin.legs[s.i]?.late,
      label: `${s.ref} · ${s.postcode}`,
    }));

  return (
    <div>
      <PageHeader
        title={`Day plan — ${driver.name}`}
        subtitle={`${formatDate(day)} · optimised across ${driver.jobs.length} jobs`}
        action={<Link href={`/runs?date=${dateStr}`} className="text-sm font-medium text-brand-600 hover:underline">← Run sheets</Link>}
      />

      {driver.jobs.length === 0 ? (
        <EmptyState message="No jobs for this driver on this date." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-3">
            <RouteMap points={mapPoints} height={420} />
            <div className="px-2 py-2 text-xs text-slate-500">
              Optimised order · {itin.totalMiles} mi · {Math.floor(itin.totalMin / 60)}h {itin.totalMin % 60}m
              {itin.anyInfeasible && <span className="ml-2 font-medium text-red-600">⚠ deadline risk</span>}
            </div>
          </Card>

          <Card className="p-5">
            <ol className="space-y-3">
              {ordered.filter((s) => s.lat != null).map((s, i) => {
                const leg = itin.legs[i];
                return (
                  <li key={`${s.jobId}-${i}`} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${leg?.late ? "bg-red-500" : "bg-brand-500"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          <Badge color={s.type === "COLLECTION" ? "blue" : "purple"}>{stopTypeLabels[s.type]}</Badge>{" "}
                          {s.name ? `${s.name} · ` : ""}{s.postcode}
                        </span>
                        <span className={`tnum ${leg?.late ? "text-red-600" : "text-slate-900"}`}>{fmt(leg?.arrival ?? null)}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        <Link href={`/bookings/${s.jobId}`} className="text-brand-600 hover:underline">{s.ref}</Link>
                        {" · "}{s.customer}
                        {i > 0 && leg ? ` · ${leg.travelMiles} mi / ${leg.travelMin} min` : " · start"}
                        {s.deadline ? ` · deadline ${fmt(s.deadline)}${leg?.late ? ` (+${leg.lateMin}m)` : ""}` : ""}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
