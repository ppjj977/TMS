import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StopStatus } from "@prisma/client";
import { updateStopStatus } from "@/actions/bookings";
import { computeItinerary, resolveProfile } from "@/lib/routing";
import { Badge, Card, JobStatusBadge, StopStatusBadge } from "@/components/ui";
import { PodForm } from "@/components/pod-form";
import {
  formatDateTime,
  serviceLevelLabels,
  stopTypeLabels,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriverJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.driverId) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, driverId: user.driverId },
    include: { customer: true, vehicle: true, stops: { orderBy: { sequence: "asc" } } },
  });
  if (!job) notFound();

  const typeProfile = await prisma.vehicleTypeProfile.findUnique({ where: { type: job.vehicleType } });
  const itinerary = computeItinerary(
    job.stops.map((s) => ({ lat: s.latitude, lng: s.longitude, requested: s.windowFrom, deadline: s.windowTo })),
    job.serviceDate,
    resolveProfile(typeProfile, job.vehicle),
  );
  const fmt = (d: Date | null) => (d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <div>
      <Link href="/driver" className="text-sm font-medium text-brand-600">
        ← My jobs
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{job.reference}</h1>
        <JobStatusBadge status={job.status} />
      </div>
      <p className="text-sm text-gray-600">{job.customer.name}</p>
      <p className="mb-3 text-xs text-gray-500">
        {serviceLevelLabels[job.serviceLevel]} · {vehicleTypeLabels[job.vehicleType]}
        {job.reference_notes ? ` · ${job.reference_notes}` : ""}
      </p>
      {job.deadlineRisk && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
          ⚠ Tight schedule — a delivery deadline may be at risk. Prioritise this run.
        </div>
      )}

      <ol className="space-y-3">
        {job.stops.map((stop, idx) => {
          const isDone = stop.status === StopStatus.COMPLETED;
          const leg = itinerary.legs[idx];
          const mapsQuery = encodeURIComponent(
            `${stop.addressLine1}, ${stop.postcode}`,
          );
          return (
            <li key={stop.id}>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {stop.sequence}
                  </span>
                  <Badge color={stop.type === "COLLECTION" ? "blue" : "purple"}>
                    {stopTypeLabels[stop.type]}
                  </Badge>
                  <StopStatusBadge status={stop.status} />
                  {!isDone && leg?.arrival && (
                    <span className={`ml-auto text-xs font-medium ${leg.late ? "text-red-600" : "text-slate-500"}`}>
                      ETA {fmt(leg.arrival)}{leg.late ? " ⚠" : ""}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-sm">
                  {stop.name && <div className="font-medium">{stop.name}</div>}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 underline"
                  >
                    {stop.addressLine1}
                    {stop.city ? `, ${stop.city}` : ""} · {stop.postcode}
                  </a>
                  {(stop.contactName || stop.contactPhone) && (
                    <div className="mt-1 text-gray-500">
                      {stop.contactName}{" "}
                      {stop.contactPhone && (
                        <a href={`tel:${stop.contactPhone}`} className="text-brand-600 underline">
                          {stop.contactPhone}
                        </a>
                      )}
                    </div>
                  )}
                  {(stop.windowFrom || stop.windowTo) && (
                    <div className="mt-1 text-xs text-gray-500">
                      Window: {formatDateTime(stop.windowFrom)} → {formatDateTime(stop.windowTo)}
                    </div>
                  )}
                  {stop.notes && <div className="mt-1 text-xs text-gray-500">{stop.notes}</div>}
                </div>

                {isDone ? (
                  <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-800">
                    <div className="font-medium">Completed {formatDateTime(stop.completedAt)}</div>
                    {stop.podName && <div>Signed by {stop.podName}</div>}
                    {stop.podSignature && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={stop.podSignature}
                        alt="Signature"
                        className="mt-1 h-14 rounded border border-green-200 bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    <div className="flex gap-2">
                      {stop.status !== StopStatus.ARRIVED && (
                        <form
                          action={updateStopStatus.bind(null, stop.id, job.id, StopStatus.ARRIVED)}
                          className="flex-1"
                        >
                          <button className="w-full rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
                            Arrived
                          </button>
                        </form>
                      )}
                      <form
                        action={updateStopStatus.bind(null, stop.id, job.id, StopStatus.FAILED)}
                        className="flex-1"
                      >
                        <button className="w-full rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700">
                          Failed
                        </button>
                      </form>
                    </div>
                    <details className="rounded-md bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-brand-700">
                        Capture POD &amp; complete
                      </summary>
                      <div className="mt-3">
                        <PodForm stopId={stop.id} jobId={job.id} />
                      </div>
                    </details>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
