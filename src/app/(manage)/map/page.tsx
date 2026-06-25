import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { lookupPostcode } from "@/lib/postcode";
import { MapView } from "./map-view";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const jobs = await prisma.job.findMany({
    where: {
      status: { in: [JobStatus.BOOKED, JobStatus.ALLOCATED, JobStatus.ON_ROUTE] },
    },
    include: { stops: { orderBy: { sequence: "asc" } } },
    orderBy: { serviceDate: "asc" },
    take: 200,
  });

  // Self-heal: backfill coordinates for any stops that have a postcode but were
  // never geocoded (e.g. booked while the lookup was unavailable). Best-effort
  // and capped so the page stays responsive; persists so it only runs once.
  let geocoded = 0;
  for (const job of jobs) {
    for (const stop of job.stops) {
      if (geocoded >= 40) break;
      if (stop.latitude == null && stop.postcode) {
        const g = await lookupPostcode(stop.postcode);
        if (g) {
          stop.latitude = g.latitude;
          stop.longitude = g.longitude;
          geocoded++;
          await prisma.stop.update({
            where: { id: stop.id },
            data: {
              latitude: g.latitude,
              longitude: g.longitude,
              city: stop.city ?? g.town,
            },
          });
        }
      }
    }
  }

  const mapped = jobs.map((j) => ({
    id: j.id,
    reference: j.reference,
    status: j.status,
    stops: j.stops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        lat: s.latitude as number,
        lng: s.longitude as number,
        type: s.type,
        sequence: s.sequence,
        label: `${s.name ? s.name + " · " : ""}${s.postcode}`,
      })),
  }));

  const withGeo = mapped.filter((j) => j.stops.length > 0);
  const plotted = withGeo.reduce((n, j) => n + j.stops.length, 0);

  return (
    <div>
      <PageHeader
        title="Live operations map"
        subtitle={`${withGeo.length} active jobs · ${plotted} located stops`}
      />
      {withGeo.length === 0 ? (
        <EmptyState
          message="No located stops to show. Stops are geocoded from their postcode when booked."
          icon={<Icon name="mapPin" size={18} />}
        />
      ) : (
        <Card className="p-2">
          <MapView jobs={withGeo} />
          <div className="flex flex-wrap gap-4 px-3 py-2 text-xs text-slate-500">
            <span>▢ Collection · ◯ Delivery · number = stop order</span>
            <span className="ml-auto">Colour = job status</span>
          </div>
        </Card>
      )}
    </div>
  );
}
