import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StopStatus } from "@prisma/client";
import { Badge, Card, JobStatusBadge, PageHeader, StopStatusBadge } from "@/components/ui";
import {
  formatDate,
  formatDateTime,
  money,
  serviceLevelLabels,
  stopTypeLabels,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.customerId) redirect("/login");

  const job = await prisma.job.findFirst({
    where: { id, customerId: user.customerId },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!job) notFound();

  return (
    <div>
      <PageHeader
        title={job.reference}
        subtitle={`${serviceLevelLabels[job.serviceLevel]} · ${formatDate(job.serviceDate)}`}
        action={
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <Link href="/portal" className="text-sm font-medium text-brand-600 hover:underline">
              ← My bookings
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Stops</h2>
            <ol className="space-y-3">
              {job.stops.map((stop) => (
                <li key={stop.id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {stop.sequence}
                    </span>
                    <Badge color={stop.type === "COLLECTION" ? "blue" : "purple"}>
                      {stopTypeLabels[stop.type]}
                    </Badge>
                    <StopStatusBadge status={stop.status} />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {stop.name && <span className="font-medium text-gray-900">{stop.name} · </span>}
                    {stop.addressLine1}
                    {stop.city ? `, ${stop.city}` : ""} · {stop.postcode}
                  </div>
                  {stop.status === StopStatus.COMPLETED && (
                    <div className="mt-2 text-xs text-green-700">
                      Delivered {formatDateTime(stop.completedAt)}
                      {stop.podName ? ` · signed by ${stop.podName}` : ""}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Summary</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Vehicle" value={vehicleTypeLabels[job.vehicleType]} />
              <Row label="Your reference" value={job.customerRef ?? "—"} />
              <Row label="Charge" value={money(job.customerCharge)} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Tracking</h2>
            {job.events.length === 0 ? (
              <p className="text-sm text-gray-500">No updates yet.</p>
            ) : (
              <ol className="space-y-3">
                {job.events.map((ev) => (
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <div>
                      <div className="text-gray-900">{ev.message}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(ev.createdAt)}</div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{value}</dd>
    </div>
  );
}
