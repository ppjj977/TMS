"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { VehicleType } from "@prisma/client";

export async function updateVehicleProfiles(formData: FormData) {
  const types = formData.getAll("type") as string[];
  const urban = formData.getAll("urban") as string[];
  const motorway = formData.getAll("motorway") as string[];
  const dwell = formData.getAll("dwell") as string[];

  for (let i = 0; i < types.length; i++) {
    const type = types[i] as VehicleType;
    if (!Object.values(VehicleType).includes(type)) continue;
    const data = {
      urbanSpeedMph: Math.max(1, Number(urban[i]) || 18),
      motorwaySpeedMph: Math.max(1, Number(motorway[i]) || 55),
      dwellMin: Math.max(0, Math.round(Number(dwell[i]) || 10)),
    };
    await prisma.vehicleTypeProfile.upsert({
      where: { type },
      create: { type, ...data },
      update: data,
    });
  }

  revalidatePath("/settings/routing");
  revalidatePath("/bookings/new");
}
