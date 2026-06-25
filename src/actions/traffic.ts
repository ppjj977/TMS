"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobStatus, ServiceLevel, VehicleType } from "@prisma/client";

function parse(formData: FormData) {
  const statuses = (formData.getAll("statuses") as string[]).filter((s) =>
    Object.values(JobStatus).includes(s as JobStatus),
  ) as JobStatus[];
  const serviceLevels = (formData.getAll("serviceLevels") as string[]).filter((s) =>
    Object.values(ServiceLevel).includes(s as ServiceLevel),
  ) as ServiceLevel[];
  const vehicleTypeRaw = (formData.get("vehicleType") as string) || "";
  const vehicleType = Object.values(VehicleType).includes(vehicleTypeRaw as VehicleType)
    ? (vehicleTypeRaw as VehicleType)
    : null;

  return {
    name: String(formData.get("name") ?? "").trim() || "Untitled view",
    orderIndex: Number(formData.get("orderIndex") ?? 0) || 0,
    statuses,
    serviceLevels,
    vehicleType,
  };
}

export async function createScreen(formData: FormData) {
  await prisma.trafficScreen.create({ data: parse(formData) });
  revalidatePath("/control");
  revalidatePath("/control/screens");
  redirect("/control/screens");
}

export async function updateScreen(id: string, formData: FormData) {
  await prisma.trafficScreen.update({ where: { id }, data: parse(formData) });
  revalidatePath("/control");
  revalidatePath("/control/screens");
  redirect("/control/screens");
}

export async function deleteScreen(id: string) {
  await prisma.trafficScreen.delete({ where: { id } });
  revalidatePath("/control");
  revalidatePath("/control/screens");
}
