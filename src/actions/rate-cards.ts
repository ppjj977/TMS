"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DayType,
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
  effectiveFrom: z.string().trim().min(1),
  effectiveTo: z.string().trim().optional(),
  active: z.coerce.boolean().default(true),
});

function parse(formData: FormData) {
  const kind = formData.get("kind") as RateCardKind;
  const parsed = rateCardSchema.parse({
    kind,
    name: formData.get("name"),
    customerId: formData.get("customerId") || undefined,
    driverId: formData.get("driverId") || undefined,
    vehicleType: formData.get("vehicleType") || undefined,
    dayType: formData.get("dayType"),
    timeBand: formData.get("timeBand"),
    ratePerMile: formData.get("ratePerMile"),
    minimumCharge: formData.get("minimumCharge") || 0,
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo") || undefined,
    active: formData.get("active") === "on",
  });

  return {
    kind: parsed.kind,
    name: parsed.name,
    // Owner only applies to the matching kind; the other is forced null.
    customerId:
      parsed.kind === RateCardKind.CUSTOMER && parsed.customerId
        ? parsed.customerId
        : null,
    driverId:
      parsed.kind === RateCardKind.DRIVER && parsed.driverId
        ? parsed.driverId
        : null,
    vehicleType: parsed.vehicleType
      ? (parsed.vehicleType as VehicleType)
      : null,
    dayType: parsed.dayType,
    timeBand: parsed.timeBand,
    ratePerMile: parsed.ratePerMile,
    minimumCharge: parsed.minimumCharge,
    effectiveFrom: new Date(parsed.effectiveFrom),
    effectiveTo: parsed.effectiveTo ? new Date(parsed.effectiveTo) : null,
    active: parsed.active,
  };
}

export async function createRateCard(formData: FormData) {
  const data = parse(formData);
  await prisma.rateCard.create({ data });
  revalidatePath("/rate-cards");
  redirect("/rate-cards");
}

export async function updateRateCard(id: string, formData: FormData) {
  const data = parse(formData);
  await prisma.rateCard.update({ where: { id }, data });
  revalidatePath("/rate-cards");
  redirect("/rate-cards");
}

export async function deleteRateCard(id: string) {
  await prisma.rateCard.delete({ where: { id } });
  revalidatePath("/rate-cards");
}
