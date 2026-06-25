"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recomputeJobCharge } from "@/lib/supplements";
import { SupplementType, VehicleType } from "@prisma/client";

// --- Manual supplements on a job -------------------------------------------

export async function addSupplement(jobId: string, formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  if (label && Number.isFinite(amount)) {
    await prisma.jobSupplement.create({ data: { jobId, label, amount, auto: false } });
    await recomputeJobCharge(jobId);
    revalidatePath(`/bookings/${jobId}`);
  }
}

export async function removeSupplement(id: string, jobId: string) {
  await prisma.jobSupplement.delete({ where: { id } });
  await recomputeJobCharge(jobId);
  revalidatePath(`/bookings/${jobId}`);
}

// --- Auto supplement rules (settings) --------------------------------------

export async function createAutoRule(formData: FormData) {
  const type = formData.get("type") as SupplementType;
  await prisma.autoSupplementRule.create({
    data: {
      name: String(formData.get("name") ?? "").trim() || "Supplement",
      type,
      amount: Number(formData.get("amount") ?? 0) || 0,
      oohStartHour: formData.get("oohStartHour") ? Number(formData.get("oohStartHour")) : null,
      oohEndHour: formData.get("oohEndHour") ? Number(formData.get("oohEndHour")) : null,
      appliesWeekend: formData.get("appliesWeekend") === "on",
      outcodes: (formData.get("outcodes") as string)?.trim() || null,
    },
  });
  revalidatePath("/settings/supplements");
}

export async function deleteAutoRule(id: string) {
  await prisma.autoSupplementRule.delete({ where: { id } });
  revalidatePath("/settings/supplements");
}

// --- Fixed postcode→postcode prices ----------------------------------------

export async function createFixedPrice(formData: FormData) {
  const vt = formData.get("vehicleType") as string;
  await prisma.fixedPrice.create({
    data: {
      customerId: (formData.get("customerId") as string) || null,
      vehicleType: vt && Object.values(VehicleType).includes(vt as VehicleType) ? (vt as VehicleType) : null,
      fromOutcode: String(formData.get("fromOutcode") ?? "").trim().toUpperCase(),
      toOutcode: String(formData.get("toOutcode") ?? "").trim().toUpperCase(),
      price: Number(formData.get("price") ?? 0) || 0,
    },
  });
  revalidatePath("/fixed-prices");
}

export async function deleteFixedPrice(id: string) {
  await prisma.fixedPrice.delete({ where: { id } });
  revalidatePath("/fixed-prices");
}
