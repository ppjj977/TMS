import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import {
  Card,
  DriverStatusBadge,
  EmptyState,
  JobStatusBadge,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { formatDate, money, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      defaultVehicle: true,
      rateCards: { where: { active: true } },
      jobs: { orderBy: { serviceDate: "desc" }, take: 15, include: { customer: true } },
    },
  });
  if (!driver) notFound();

  const active = driver.jobs.filter(
    (j) => j.status === JobStatus.ALLOCATED || j.status === JobStatus.ON_ROUTE,
  ).length;

  return (
    <div>
      <PageHeader
        title={driver.name}
        subtitle={driver.phone ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <DriverStatusBadge status={driver.status} />
            <LinkButton href={`/drivers/${driver.id}/edit`} variant="secondary">Edit</LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Recent jobs</h2>
            {driver.jobs.length === 0 ? (
              <EmptyState message="No jobs assigned to this driver yet." />
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {driver.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                          {job.reference}
                        </Link>
                      </td>
                      <td className="py-2">{formatDate(job.serviceDate)}</td>
                      <td className="py-2">{job.customer.name}</td>
                      <td className="py-2">{money(job.driverCost)}</td>
                      <td className="py-2"><JobStatusBadge status={job.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Email" value={driver.email} />
              <Info label="Phone" value={driver.phone} />
              <Info label="Licence" value={driver.licenceNumber} />
              <Info
                label="Default vehicle"
                value={
                  driver.defaultVehicle
                    ? `${driver.defaultVehicle.registration} (${vehicleTypeLabels[driver.defaultVehicle.type]})`
                    : null
                }
              />
              <Info label="Active jobs" value={String(active)} />
              <Info label="Active rate cards" value={String(driver.rateCards.length)} />
            </dl>
            {driver.notes && (
              <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-600">{driver.notes}</p>
            )}
          </Card>

          <LinkButton href={`/rate-cards/new?kind=DRIVER&driverId=${driver.id}`} variant="secondary">
            + Rate card for this driver
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{value || "—"}</dd>
    </div>
  );
}
