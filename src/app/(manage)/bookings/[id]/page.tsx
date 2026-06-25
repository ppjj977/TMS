import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobStatus, StopStatus } from "@prisma/client";
import {
  allocateJob,
  cancelJob,
  recalcJobPricing,
  updateJobStatus,
  updateStopStatus,
} from "@/actions/bookings";
import { addSupplement, removeSupplement } from "@/actions/supplements";
import {
  Badge,
  Button,
  Card,
  JobStatusBadge,
  PageHeader,
  Select,
  StopStatusBadge,
} from "@/components/ui";
import {
  dayTypeLabels,
  formatDate,
  formatDateTime,
  miles,
  money,
  stopTypeLabels,
  timeBandLabels,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      customer: true,
      contact: true,
      driver: true,
      vehicle: true,
      stops: { orderBy: { sequence: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
      supplements: true,
    },
  });

  if (!job) notFound();

  const [drivers, vehicles, customerRate, driverRate] = await Promise.all([
    prisma.driver.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ where: { status: "ACTIVE" }, orderBy: { registration: "asc" } }),
    job.customerRateCardId
      ? prisma.rateCard.findUnique({ where: { id: job.customerRateCardId } })
      : null,
    job.driverRateCardId
      ? prisma.rateCard.findUnique({ where: { id: job.driverRateCardId } })
      : null,
  ]);

  const margin = job.customerCharge - job.driverCost;
  const marginPct = job.customerCharge > 0 ? (margin / job.customerCharge) * 100 : 0;

  const allocate = allocateJob.bind(null, job.id);
  const recalc = recalcJobPricing.bind(null, job.id);
  const cancel = cancelJob.bind(null, job.id);

  // Status transitions offered as quick buttons.
  const transitions: JobStatus[] = (() => {
    switch (job.status) {
      case JobStatus.BOOKED:
        return [JobStatus.ALLOCATED, JobStatus.CANCELLED];
      case JobStatus.ALLOCATED:
        return [JobStatus.ON_ROUTE, JobStatus.BOOKED, JobStatus.CANCELLED];
      case JobStatus.ON_ROUTE:
        return [JobStatus.COMPLETED];
      case JobStatus.COMPLETED:
        return [JobStatus.INVOICED, JobStatus.ON_ROUTE];
      case JobStatus.INVOICED:
        return [JobStatus.COMPLETED];
      case JobStatus.CANCELLED:
        return [JobStatus.BOOKED];
    }
  })();

  return (
    <div>
      <PageHeader
        title={job.reference}
        subtitle={`${job.customer.name} · ${formatDate(job.serviceDate)}`}
        action={
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <Link
              href={`/pod/${job.id}`}
              target="_blank"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              POD / PDF
            </Link>
            <Link href="/bookings" className="text-sm font-medium text-brand-600 hover:underline">
              ← Bookings
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: stops + details */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Job details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Detail label="Customer">
                <Link href={`/customers/${job.customerId}`} className="text-brand-600 hover:underline">
                  {job.customer.name}
                </Link>
              </Detail>
              <Detail label="Contact">{job.contact?.name ?? "—"}</Detail>
              <Detail label="Customer ref">{job.customerRef ?? "—"}</Detail>
              <Detail label="Vehicle type">{vehicleTypeLabels[job.vehicleType]}</Detail>
              <Detail label="Service date">{formatDateTime(job.serviceDate)}</Detail>
              <Detail label="Distance">{miles(job.distanceMiles)}</Detail>
              <Detail label="Pieces">{job.pieces}</Detail>
              <Detail label="Weight">{job.weightKg} kg</Detail>
              <Detail label="Day type">{dayTypeLabels[job.dayType]}</Detail>
              <Detail label="Time band">{timeBandLabels[job.timeBand]}</Detail>
              <Detail label="Est. minutes">{job.estimatedMins} min</Detail>
            </dl>
            {job.reference_notes && (
              <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                {job.reference_notes}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">
              Stops <span className="text-sm font-normal text-gray-400">({job.stops.length})</span>
            </h2>
            <ol className="space-y-3">
              {job.stops.map((stop) => (
                <li key={stop.id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                          {stop.sequence}
                        </span>
                        <Badge color={stop.type === "COLLECTION" ? "blue" : "purple"}>
                          {stopTypeLabels[stop.type]}
                        </Badge>
                        <StopStatusBadge status={stop.status} />
                      </div>
                      <div className="mt-2 text-sm">
                        {stop.name && <div className="font-medium">{stop.name}</div>}
                        <div className="text-gray-600">
                          {stop.addressLine1}
                          {stop.addressLine2 ? `, ${stop.addressLine2}` : ""}
                          {stop.city ? `, ${stop.city}` : ""} · {stop.postcode}
                        </div>
                        {(stop.contactName || stop.contactPhone) && (
                          <div className="mt-1 text-gray-500">
                            {stop.contactName} {stop.contactPhone && `· ${stop.contactPhone}`}
                          </div>
                        )}
                        {(stop.windowFrom || stop.windowTo) && (
                          <div className="mt-1 text-xs text-gray-500">
                            Window: {formatDateTime(stop.windowFrom)} → {formatDateTime(stop.windowTo)}
                          </div>
                        )}
                        {stop.notes && <div className="mt-1 text-xs text-gray-500">{stop.notes}</div>}
                        {stop.completedAt && (
                          <div className="mt-2 rounded-md bg-green-50 p-2 text-xs text-green-800 ring-1 ring-inset ring-green-200">
                            <div className="font-medium">
                              POD · {formatDateTime(stop.completedAt)}
                            </div>
                            {stop.podName && <div>Signed by {stop.podName}</div>}
                            {stop.podNotes && <div>{stop.podNotes}</div>}
                            {stop.podSignature && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={stop.podSignature}
                                alt="Signature"
                                className="mt-1 h-16 rounded border border-green-200 bg-white"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {(
                        [
                          StopStatus.ARRIVED,
                          StopStatus.COMPLETED,
                          StopStatus.FAILED,
                          StopStatus.PENDING,
                        ] as StopStatus[]
                      )
                        .filter((s) => s !== stop.status)
                        .map((s) => (
                          <form key={s} action={updateStopStatus.bind(null, stop.id, job.id, s)}>
                            <button className="w-full rounded px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                              Mark {s.toLowerCase()}
                            </button>
                          </form>
                        ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Right: allocation, status, pricing */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Allocation</h2>
            <form action={allocate} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Driver
                <Select
                  name="driverId"
                  defaultValue={job.driverId ?? ""}
                  className="mt-1"
                  options={[
                    { value: "", label: "— unallocated —" },
                    ...drivers.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Vehicle
                <Select
                  name="vehicleId"
                  defaultValue={job.vehicleId ?? ""}
                  className="mt-1"
                  options={[
                    { value: "", label: "— driver default —" },
                    ...vehicles.map((v) => ({
                      value: v.id,
                      label: `${v.registration} (${vehicleTypeLabels[v.type]})`,
                    })),
                  ]}
                />
              </label>
              <Button type="submit" className="w-full justify-center">
                Save allocation
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Status</h2>
            <div className="flex flex-wrap gap-2">
              {transitions.map((s) => (
                <form key={s} action={updateJobStatus.bind(null, job.id, s)}>
                  <Button
                    type="submit"
                    variant={s === JobStatus.CANCELLED ? "danger" : "secondary"}
                  >
                    → {s.replace("_", " ").toLowerCase()}
                  </Button>
                </form>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pricing</h2>
              <form action={recalc}>
                <button className="text-xs font-medium text-brand-600 hover:underline">
                  Recalculate
                </button>
              </form>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Base charge" value={money(job.baseCharge)} />
              <div className="pl-2 text-xs text-gray-500">
                {customerRate ? `via ${customerRate.name}` : "no matching customer rate card"}
              </div>
              {job.supplements.map((s) => (
                <div key={s.id} className="flex items-center justify-between pl-2 text-xs">
                  <span className="text-gray-500">
                    + {s.label} {s.auto && <span className="text-gray-400">(auto)</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-700">{money(s.amount)}</span>
                    <form action={removeSupplement.bind(null, s.id, job.id)}>
                      <button className="text-red-500 hover:underline">✕</button>
                    </form>
                  </span>
                </div>
              ))}
              <form action={addSupplement.bind(null, job.id)} className="flex items-center gap-1.5 pl-2">
                <input name="label" placeholder="Supplement" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                <input name="amount" type="number" step="0.01" placeholder="£" className="w-16 rounded border border-slate-300 px-2 py-1 text-xs" />
                <button className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">Add</button>
              </form>
              <Row label="Customer charge" value={money(job.customerCharge)} strong />
              <Row label="Driver cost" value={money(job.driverCost)} />
              <div className="pl-2 text-xs text-gray-500">
                {driverRate
                  ? `via ${driverRate.name}`
                  : job.driverId
                    ? "no matching driver rate card"
                    : "allocate a driver to cost"}
              </div>
              <div className="my-2 border-t border-gray-100" />
              <Row
                label="Margin"
                value={`${money(margin)} (${marginPct.toFixed(1)}%)`}
                strong
              />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
            {job.events.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {job.events.map((ev) => (
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div>
                      <div className="text-gray-900">{ev.message}</div>
                      <div className="text-xs text-gray-400">
                        {formatDateTime(ev.createdAt)} · {ev.actor}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={strong ? "font-semibold text-gray-900" : "text-gray-700"}>{value}</dd>
    </div>
  );
}
