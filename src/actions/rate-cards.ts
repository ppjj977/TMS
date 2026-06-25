"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DayType,
  RateBandType,
  RateCardKind,
  TimeBand,
  VehicleType,
} from "@prisma/client";

const rateCardSchema = z.object({
  kind: z.nativeEnum(RateCardKind),
  name: z.string().trim().min(1, "Name is required"),
  customerId: z.string().trim().optional(),
  driverId: z.string().trim().optional(),
  vehicleType: z.string().trim().optional(),
  dayType: z.nativeEnum(DayType),
  timeBand: z.nativeEnum(TimeBand),
  ratePerMile: z.coerce.number().min(0),
  minimumCharge: z.coerce.number().min(0).default(0),
  waitingPerHour: z.coerce.number().min(0).default(0),
  retailPct: z.coerce.number().min(0).default(0),
  effectiveFrom: z.string().trim().min(1),
  effectiveTo: z.string().trim().optional(),
  active: z.coerce.boolean().default(true),
});

function parseBase(formData: FormData) {
  const kind = formData.get("kind") as RateCardKind;
  const p = rateCardSchema.parse({
    kind,
    name: formData.get("name"),
    customerId: formData.get("customerId") || undefined,
    driverId: formData.get("driverId") || undefined,
    vehicleType: formData.get("vehicleType") || undefined,
    dayType: formData.get("dayType"),
    timeBand: formData.get("timeBand"),
    ratePerMile: formData.get("ratePerMile"),
    minimumCharge: formData.get("minimumCharge") || 0,
    waitingPerHour: formData.get("waitingPerHour") || 0,
    retailPct: formData.get("retailPct") || 0,
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo") || undefined,
    active: formData.get("active") === "on",
  });

  return {
    kind: p.kind,
    name: p.name,
    customerId: p.kind === RateCardKind.CUSTOMER && p.customerId ? p.customerId : null,
    driverId: p.kind === RateCardKind.DRIVER && p.driverId ? p.driverId : null,
    vehicleType: p.vehicleType ? (p.vehicleType as VehicleType) : null,
    dayType: p.dayType,
    timeBand: p.timeBand,
    ratePerMile: p.ratePerMile,
    minimumCharge: p.minimumCharge,
    waitingPerHour: p.waitingPerHour,
    retailPct: p.retailPct,
    effectiveFrom: new Date(p.effectiveFrom),
    effectiveTo: p.effectiveTo ? new Date(p.effectiveTo) : null,
    active: p.active,
  };
}

// Parse repeating band_* fields into rows; blank rows are dropped.
function parseBands(formData: FormData) {
  const types = formData.getAll("band_type") as string[];
  const mins = formData.getAll("band_min") as string[];
  const maxs = formData.getAll("band_max") as string[];
  const rates = formData.getAll("band_rate") as string[];

  const rows = types
    .map((t, i) => ({
      type: t as RateBandType,
      minValue: Number(mins[i] ?? 0),
      maxValue: Number(maxs[i] ?? 0),
      rate: Number(rates[i] ?? 0),
    }))
    .filter(
      (r) =>
        Object.values(RateBandType).includes(r.type) &&
        !Number.isNaN(r.rate) &&
        (r.maxValue > 0 || r.minValue > 0 || r.rate > 0),
    );
  return rows;
}

export async function createRateCard(formData: FormData) {
  const data = parseBase(formData);
  const bands = parseBands(formData);
  await prisma.rateCard.create({
    data: { ...data, bands: { create: bands } },
  });
  revalidatePath("/rate-cards");
  redirect("/rate-cards");
}

export async function updateRateCard(id: string, formData: FormData) {
  const data = parseBase(formData);
  const bands = parseBands(formData);
  // Replace bands wholesale — simplest correct behaviour for the editor.
  await prisma.$transaction([
    prisma.rateBand.deleteMany({ where: { rateCardId: id } }),
    prisma.rateCard.update({
      where: { id },
      data: { ...data, bands: { create: bands } },
    }),
  ]);
  revalidatePath("/rate-cards");
  redirect("/rate-cards");
}

export async function deleteRateCard(id: string) {
  await prisma.rateCard.delete({ where: { id } });
  revalidatePath("/rate-cards");
}
