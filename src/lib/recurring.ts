import { JobEventType, StopType } from "@prisma/client";
import { prisma } from "./prisma";
import { classifyDay, classifyTimeBand, outcode, priceJob } from "./pricing";
import { routeDistanceMiles } from "./postcode";
import { evaluateAutoSupplements } from "./supplements";
import { nextJobReference } from "./reference";
import { logJobEvent } from "./events";

type Template = Awaited<ReturnType<typeof loadTemplate>>;

function loadTemplate(id: string) {
  return prisma.recurringJob.findUniqueOrThrow({
    where: { id },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });
}

function dayMatches(t: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean }, date: Date): boolean {
  return [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat][date.getDay()];
}

/** Create a single Job from a template for a given date. */
async function generateOne(template: Template, date: Date): Promise<string | null> {
  const serviceDate = new Date(date);
  serviceDate.setHours(template.startHour, template.startMinute, 0, 0);

  // Skip if already generated for this template + day.
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const existing = await prisma.job.findFirst({
    where: { recurringJobId: template.id, serviceDate: { gte: dayStart, lt: dayEnd } },
  });
  if (existing) return null;

  const stops = template.stops;
  if (stops.length === 0) return null;

  const dayType = classifyDay(serviceDate);
  const timeBand = classifyTimeBand(serviceDate);
  const distanceMiles = routeDistanceMiles(
    stops.map((s) => (s.latitude != null && s.longitude != null ? { latitude: s.latitude, longitude: s.longitude } : null)),
  );
  const drops = stops.filter((s) => s.type === StopType.DELIVERY).length;
  const firstCol = stops.find((s) => s.type === StopType.COLLECTION) ?? stops[0];
  const lastDel = [...stops].reverse().find((s) => s.type === StopType.DELIVERY) ?? stops[stops.length - 1];

  const pricing = await priceJob({
    vehicleType: template.vehicleType,
    dayType,
    timeBand,
    serviceDate,
    distanceMiles,
    drops,
    pieces: template.pieces,
    customerId: template.customerId,
    fromOutcode: outcode(firstCol.postcode),
    toOutcode: outcode(lastDel.postcode),
  });

  const autoSupps = await evaluateAutoSupplements({ serviceDate, postcodes: stops.map((s) => s.postcode) });
  const baseCharge = pricing.customerCharge;
  const customerCharge = Math.round((baseCharge + autoSupps.reduce((s, x) => s + x.amount, 0)) * 100) / 100;

  const job = await prisma.job.create({
    data: {
      reference: await nextJobReference(serviceDate),
      customerId: template.customerId,
      vehicleType: template.vehicleType,
      serviceLevel: template.serviceLevel,
      serviceDate,
      dayType,
      timeBand,
      distanceMiles,
      pieces: template.pieces,
      weightKg: template.weightKg,
      recurringJobId: template.id,
      reference_notes: `Recurring: ${template.name}`,
      baseCharge,
      customerCharge,
      driverCost: pricing.driverCost,
      customerRateCardId: pricing.customerRateCardId,
      driverRateCardId: pricing.driverRateCardId,
      supplements: { create: autoSupps.map((s) => ({ label: s.label, amount: s.amount, auto: true })) },
      stops: {
        create: stops.map((s, i) => ({
          sequence: i + 1,
          type: s.type,
          name: s.name,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2,
          city: s.city,
          postcode: s.postcode,
          latitude: s.latitude,
          longitude: s.longitude,
          contactName: s.contactName,
          contactPhone: s.contactPhone,
        })),
      },
    },
  });
  await logJobEvent(job.id, JobEventType.CREATED, `Generated from recurring "${template.name}"`, "system");
  return job.id;
}

/** Generate due bookings for all active templates over the next `daysAhead` days. */
export async function generateDueRecurring(daysAhead = 7): Promise<number> {
  const templates = await prisma.recurringJob.findMany({
    where: { active: true },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let created = 0;

  for (const template of templates) {
    for (let d = 0; d <= daysAhead; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      if (!dayMatches(template, date)) continue;
      const id = await generateOne(template, date);
      if (id) created++;
    }
  }
  return created;
}
