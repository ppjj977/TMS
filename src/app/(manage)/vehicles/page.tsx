import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  VehicleStatusBadge,
} from "@/components/ui";
import { vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { registration: "asc" },
    include: { _count: { select: { drivers: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Fleet"
        action={<LinkButton href="/vehicles/new">+ New vehicle</LinkButton>}
      />

      {vehicles.length === 0 ? (
        <EmptyState message="No vehicles yet. Add your first vehicle." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Make / model</th>
                  <th className="px-4 py-3">Assigned drivers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">{v.registration}</td>
                    <td className="px-4 py-3">{vehicleTypeLabels[v.type]}</td>
                    <td className="px-4 py-3">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3">{v._count.drivers}</td>
                    <td className="px-4 py-3"><VehicleStatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/vehicles/${v.id}/edit`} className="text-sm text-brand-600 hover:underline">
                        Edit
                      </Link>
                    </td>
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
