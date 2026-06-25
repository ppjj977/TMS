import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import {
  Card,
  DriverStatusBadge,
  EmptyState,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
    include: {
      defaultVehicle: true,
      _count: {
        select: {
          jobs: { where: { status: { in: [JobStatus.ALLOCATED, JobStatus.ON_ROUTE] } } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Drivers"
        action={<LinkButton href="/drivers/new">+ New driver</LinkButton>}
      />

      {drivers.length === 0 ? (
        <EmptyState message="No drivers yet. Add your first driver." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Default vehicle</th>
                  <th className="px-4 py-3">Active jobs</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/drivers/${d.id}`} className="text-brand-600 hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{d.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {d.defaultVehicle
                        ? `${d.defaultVehicle.registration} (${vehicleTypeLabels[d.defaultVehicle.type]})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{d._count.jobs}</td>
                    <td className="px-4 py-3"><DriverStatusBadge status={d.status} /></td>
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
