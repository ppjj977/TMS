import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, EmptyState, JobStatusBadge, LinkButton, PageHeader } from "@/components/ui";
import { formatDate, money, serviceLevelLabels, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const user = await getCurrentUser();
  if (!user?.customerId) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { customerId: user.customerId },
    include: { _count: { select: { stops: true } } },
    orderBy: { serviceDate: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="My bookings"
        subtitle="Track your deliveries"
        action={<LinkButton href="/portal/new">+ New booking</LinkButton>}
      />

      {jobs.length === 0 ? (
        <EmptyState message="You have no bookings yet." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Stops</th>
                  <th className="px-4 py-3">Charge</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/portal/${job.id}`} className="text-brand-600 hover:underline">
                        {job.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatDate(job.serviceDate)}</td>
                    <td className="px-4 py-3">{serviceLevelLabels[job.serviceLevel]}</td>
                    <td className="px-4 py-3">{job._count.stops}</td>
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
