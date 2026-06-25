"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DriverStatus } from "@prisma/client";

const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  status: z.nativeEnum(DriverStatus),
  licenceNumber: z.string().trim().optional(),
  defaultVehicleId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return driverSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    status: formData.get("status"),
    licenceNumber: formData.get("licenceNumber") || undefined,
    defaultVehicleId: formData.get("defaultVehicleId") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createDriver(formData: FormData) {
  const data = parse(formData);
  const driver = await prisma.driver.create({
    data: { ...data, defaultVehicleId: data.defaultVehicleId || null },
  });
  revalidatePath("/drivers");
  redirect(`/drivers/${driver.id}`);
}

export async function updateDriver(id: string, formData: FormData) {
  const data = parse(formData);
  await prisma.driver.update({
    where: { id },
    data: { ...data, defaultVehicleId: data.defaultVehicleId || null },
  });
  revalidatePath("/drivers");
  revalidatePath(`/drivers/${id}`);
  redirect(`/drivers/${id}`);
}
