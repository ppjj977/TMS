import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateVehicleProfiles } from "@/actions/vehicle-profiles";
import { Button, Card, PageHeader, Table, TBody, THead, Th } from "@/components/ui";
import { DEFAULT_PROFILE } from "@/lib/routing";
import { vehicleTypes, vehicleTypeLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RoutingSettingsPage() {
  const existing = await prisma.vehicleTypeProfile.findMany();
  const byType = new Map(existing.map((p) => [p.type, p]));

  return (
    <div>
      <PageHeader
        title="Routing speeds"
        subtitle="Per-vehicle speeds & dwell used to estimate ETAs and deadline risk"
        action={
          <Link href="/settings" className="text-sm font-medium text-brand-600 hover:underline">
            ← Company settings
          </Link>
        }
      />

      <Card>
        <form action={updateVehicleProfiles}>
          <Table>
            <THead>
              <Th>Vehicle type</Th>
              <Th>Urban speed (mph)</Th>
              <Th>Motorway speed (mph)</Th>
              <Th>Dwell per stop (min)</Th>
            </THead>
            <TBody>
              {vehicleTypes.map((t) => {
                const p = byType.get(t);
                return (
                  <tr key={t}>
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {vehicleTypeLabels[t]}
                      <input type="hidden" name="type" value={t} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        name="urban"
                        defaultValue={p?.urbanSpeedMph ?? DEFAULT_PROFILE.urbanSpeedMph}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:shadow-focus"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        name="motorway"
                        defaultValue={p?.motorwaySpeedMph ?? DEFAULT_PROFILE.motorwaySpeedMph}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:shadow-focus"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        name="dwell"
                        defaultValue={p?.dwellMin ?? DEFAULT_PROFILE.dwellMin}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:shadow-focus"
                      />
                    </td>
                  </tr>
                );
              })}
            </TBody>
          </Table>
          <div className="flex justify-end border-t border-slate-100 p-4">
            <Button type="submit">Save routing speeds</Button>
          </div>
        </form>
      </Card>

      <p className="mt-3 text-xs text-slate-400">
        Short legs use the urban speed, long legs the motorway speed, interpolated between 3 and 25
        miles — so town hops are slow and trunk runs are fast.
      </p>
    </div>
  );
}
