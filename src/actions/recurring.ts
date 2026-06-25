"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lookupPostcode } from "@/lib/postcode";
import { generateDueRecurring } from "@/lib/recurring";
import { ServiceLevel, StopType, VehicleType } from "@prisma/client";

function parseStops(formData: FormData) {
  const types = formData.getAll("stop_type") as string[];
  const names = formData.getAll("stop_name") as string[];
  const a1 = formData.getAll("stop_addressLine1") as string[];
  const a2 = formData.getAll("stop_addressLine2") as string[];
  const cities = formData.getAll("stop_city") as string[];
  const pcs = formData.getAll("stop_postcode") as string[];
  const cn = formData.getAll("stop_contactName") as string[];
  const cp = formData.getAll("stop_contactPhone") as string[];

  return types
    .map((t, i) => ({
      type: (t as StopType) ?? StopType.DELIVERY,
      name: names[i] || null,
      addressLine1: a1[i] || "",
      addressLine2: a2[i] || null,
      city: cities[i] || null,
      postcode: (pcs[i] || "").toUpperCase(),
      contactName: cn[i] || null,
      contactPhone: cp[i] || null,
    }))
    .filter((s) => s.addressLine1 && s.postcode);
}

export async function createRecurring(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  if (!customerId) redirect("/recurring");

  const stops = parseStops(formData);
  const geos = await Promise.all(stops.map((s) => lookupPostcode(s.postcode)));

  await prisma.recurringJob.create({
    data: {
      name: String(formData.get("name") ?? "").trim() || "Standing job",
      customerId,
      vehicleType: formData.get("vehicleType") as VehicleType,
      serviceLevel: (formData.get("serviceLevel") as ServiceLevel) || ServiceLevel.SAMEDAY_STANDARD,
      pieces: Number(formData.get("pieces") ?? 1) || 1,
      weightKg: Number(formData.get("weightKg") ?? 0) || 0,
      startHour: Number(formData.get("startHour") ?? 9) || 9,
      startMinute: Number(formData.get("startMinute") ?? 0) || 0,
      notes: (formData.get("notes") as string) || null,
      mon: formData.get("mon") === "on",
      tue: formData.get("tue") === "on",
      wed: formData.get("wed") === "on",
      thu: formData.get("thu") === "on",
      fri: formData.get("fri") === "on",
      sat: formData.get("sat") === "on",
      sun: formData.get("sun") === "on",
      stops: {
        create: stops.map((s, i) => ({
          sequence: i + 1,
          type: s.type,
          name: s.name,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2,
          city: s.city || geos[i]?.town || null,
          postcode: s.postcode,
          contactName: s.contactName,
          contactPhone: s.contactPhone,
          latitude: geos[i]?.latitude ?? null,
          longitude: geos[i]?.longitude ?? null,
        })),
      },
    },
  });

  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function deleteRecurring(id: string) {
  await prisma.recurringJob.delete({ where: { id } });
  revalidatePath("/recurring");
}

export async function toggleRecurring(id: string, active: boolean) {
  await prisma.recurringJob.update({ where: { id }, data: { active } });
  revalidatePath("/recurring");
}

export async function generateNow() {
  const created = await generateDueRecurring(7);
  revalidatePath("/recurring");
  revalidatePath("/bookings");
  revalidatePath("/");
  redirect(`/recurring?generated=${created}`);
}
