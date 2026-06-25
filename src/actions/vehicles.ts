"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VehicleStatus, VehicleType } from "@prisma/client";

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

const vehicleSchema = z.object({
  registration: z.string().trim().min(1, "Registration is required"),
  type: z.nativeEnum(VehicleType),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  status: z.nativeEnum(VehicleStatus),
  notes: z.string().trim().optional(),
  urbanSpeedMph: optionalNumber,
  motorwaySpeedMph: optionalNumber,
  dwellMin: optionalNumber,
});

function parse(formData: FormData) {
  const v = vehicleSchema.parse({
    registration: formData.get("registration"),
    type: formData.get("type"),
    make: formData.get("make") || undefined,
    model: formData.get("model") || undefined,
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
    urbanSpeedMph: formData.get("urbanSpeedMph") ?? undefined,
    motorwaySpeedMph: formData.get("motorwaySpeedMph") ?? undefined,
    dwellMin: formData.get("dwellMin") ?? undefined,
  });
  return {
    ...v,
    dwellMin: v.dwellMin == null ? null : Math.round(v.dwellMin),
  };
}

export async function createVehicle(formData: FormData) {
  const data = parse(formData);
  const vehicle = await prisma.vehicle.create({
    data: { ...data, registration: data.registration.toUpperCase() },
  });
  revalidatePath("/vehicles");
  redirect(`/vehicles`);
}

export async function updateVehicle(id: string, formData: FormData) {
  const data = parse(formData);
  await prisma.vehicle.update({
    where: { id },
    data: { ...data, registration: data.registration.toUpperCase() },
  });
  revalidatePath("/vehicles");
  redirect(`/vehicles`);
}
