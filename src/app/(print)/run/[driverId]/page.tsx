import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompanySetting } from "@/lib/company";
import { PrintButton } from "@/components/print-button";
import { LogoMark } from "@/components/logo";
import {
  formatDate,
  formatTime,
  miles,
  stopTypeLabels,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RunSheetPage({
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
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [driver, company, jobs] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId }, include: { defaultVehicle: true } }),
    getCompanySetting(),
    prisma.job.findMany({
      where: { driverId, serviceDate: { gte: start, lt: end } },
      include: { customer: true, vehicle: true, stops: { orderBy: { sequence: "asc" } } },
      orderBy: { serviceDate: "asc" },
    }),
  ]);
  if (!driver) notFound();

  const totalStops = jobs.reduce((n, j) => n + j.stops.length, 0);
  const totalMiles = jobs.reduce((n, j) => n + j.distanceMiles, 0);

  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="rounded-xl bg-white p-10 shadow-card print:rounded-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={40} className="rounded-xl" />
            <div className="text-base font-semibold text-slate-900">{company.name}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">RUN SHEET</div>
            <div className="text-sm text-slate-500">{formatDate(day)}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between gap-4 rounded-lg bg-slate-50 p-4 text-sm">
          <div>
            <span className="text-slate-500">Driver: </span>
            <span className="font-semibold text-slate-900">{driver.name}</span>
            {driver.phone && <span className="text-slate-500"> · {driver.phone}</span>}
          </div>
          <div>
            <span className="text-slate-500">Vehicle: </span>
            <span className="font-medium text-slate-900">
              {driver.defaultVehicle
                ? `${driver.defaultVehicle.registration} (${vehicleTypeLabels[driver.defaultVehicle.type]})`
                : "—"}
            </span>
          </div>
          <div className="text-slate-500">
            {jobs.length} jobs · {totalStops} stops · {miles(totalMiles)}
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="mt-8 text-center text-sm text-slate-400">No jobs allocated for this date.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {jobs.map((job) => (
              <div key={job.id} className="break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <div className="font-semibold text-slate-900">
                    {job.reference} · {job.customer.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {vehicleTypeLabels[job.vehicleType]} · {job.pieces} pcs
                    {job.customerRef ? ` · ${job.customerRef}` : ""}
                  </div>
                </div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {job.stops.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 align-top">
                        <td className="w-8 py-2 font-semibold text-slate-500">{s.sequence}</td>
                        <td className="w-20 py-2">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                            {stopTypeLabels[s.type]}
                          </span>
                        </td>
                        <td className="py-2 text-slate-700">
                          {s.name && <div className="font-medium">{s.name}</div>}
                          {s.addressLine1}
                          {s.city ? `, ${s.city}` : ""} · {s.postcode}
                          {s.contactName && <div className="text-xs text-slate-500">{s.contactName} {s.contactPhone}</div>}
                        </td>
                        <td className="w-24 py-2 text-right text-xs text-slate-500">
                          {s.windowFrom ? `${formatTime(s.windowFrom)}–${formatTime(s.windowTo)}` : ""}
                        </td>
                        <td className="w-16 py-2 text-right text-xs text-slate-400">______</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span>Driver signature: ____________________</span>
          <span>Date: __________</span>
        </div>
      </div>
    </div>
  );
}
