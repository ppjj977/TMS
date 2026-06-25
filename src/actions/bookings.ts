"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextJobReference } from "@/lib/reference";
import { classifyDay, classifyTimeBand, priceJob } from "@/lib/pricing";
import {
  JobStatus,
  StopStatus,
  StopType,
  VehicleType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Create booking (multi-drop)
// ---------------------------------------------------------------------------

const stopSchema = z.object({
  type: z.nativeEnum(StopType),
  name: z.string().trim().optional(),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().min(1, "Postcode is required"),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  windowFrom: z.string().trim().optional(),
  windowTo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/** Pull repeating stop_* fields out of the form and zip them into stop rows. */
function parseStops(formData: FormData) {
  const types = formData.getAll("stop_type") as string[];
  const names = formData.getAll("stop_name") as string[];
  const addr1 = formData.getAll("stop_addressLine1") as string[];
  const addr2 = formData.getAll("stop_addressLine2") as string[];
  const cities = formData.getAll("stop_city") as string[];
  const postcodes = formData.getAll("stop_postcode") as string[];
  const contactNames = formData.getAll("stop_contactName") as string[];
  const contactPhones = formData.getAll("stop_contactPhone") as string[];
  const windowFroms = formData.getAll("stop_windowFrom") as string[];
  const windowTos = formData.getAll("stop_windowTo") as string[];
  const notes = formData.getAll("stop_notes") as string[];

  const rows = types.map((_, i) =>
    stopSchema.parse({
      type: types[i],
      name: names[i] || undefined,
      addressLine1: addr1[i],
      addressLine2: addr2[i] || undefined,
      city: cities[i] || undefined,
      postcode: postcodes[i],
      contactName: contactNames[i] || undefined,
      contactPhone: contactPhones[i] || undefined,
      windowFrom: windowFroms[i] || undefined,
      windowTo: windowTos[i] || undefined,
      notes: notes[i] || undefined,
    }),
  );

  // Drop rows the operator left entirely blank.
  return rows.filter((r) => r.addressLine1 && r.postcode);
}

const bookingSchema = z.object({
  customerId: z.string().trim().min(1, "Customer is required"),
  contactId: z.string().trim().optional(),
  vehicleType: z.nativeEnum(VehicleType),
  serviceDate: z.string().trim().min(1, "Service date is required"),
  distanceMiles: z.coerce.number().min(0).default(0),
  estimatedMins: z.coerce.number().int().min(0).default(0),
  customerRef: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function createBooking(formData: FormData) {
  const data = bookingSchema.parse({
    customerId: formData.get("customerId"),
    contactId: formData.get("contactId") || undefined,
    vehicleType: formData.get("vehicleType"),
    serviceDate: formData.get("serviceDate"),
    distanceMiles: formData.get("distanceMiles") || 0,
    estimatedMins: formData.get("estimatedMins") || 0,
    customerRef: formData.get("customerRef") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const stops = parseStops(formData);
  if (stops.length === 0) {
    throw new Error("At least one stop with an address and postcode is required.");
  }

  const serviceDate = new Date(data.serviceDate);
  const dayType = classifyDay(serviceDate);
  const timeBand = classifyTimeBand(serviceDate);

  const pricing = await priceJob({
    vehicleType: data.vehicleType,
    dayType,
    timeBand,
    serviceDate,
    distanceMiles: data.distanceMiles,
    customerId: data.customerId,
  });

  const reference = await nextJobReference();

  const job = await prisma.job.create({
    data: {
      reference,
      customerId: data.customerId,
      contactId: data.contactId || null,
      vehicleType: data.vehicleType,
      serviceDate,
      dayType,
      timeBand,
      distanceMiles: data.distanceMiles,
      estimatedMins: data.estimatedMins,
      customerRef: data.customerRef,
      reference_notes: data.notes,
      customerCharge: pricing.customerCharge,
      driverCost: pricing.driverCost,
      customerRateCardId: pricing.customerRateCardId,
      driverRateCardId: pricing.driverRateCardId,
      stops: {
        create: stops.map((s, i) => ({
          sequence: i + 1,
          type: s.type,
          name: s.name,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2,
          city: s.city,
          postcode: s.postcode.toUpperCase(),
          contactName: s.contactName,
          contactPhone: s.contactPhone,
          windowFrom: s.windowFrom ? new Date(s.windowFrom) : null,
          windowTo: s.windowTo ? new Date(s.windowTo) : null,
          notes: s.notes,
        })),
      },
    },
  });

  revalidatePath("/bookings");
  revalidatePath("/");
  redirect(`/bookings/${job.id}`);
}

// ---------------------------------------------------------------------------
// Pricing recompute (shared by allocation & edits)
// ---------------------------------------------------------------------------

async function recalc(jobId: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  const pricing = await priceJob({
    vehicleType: job.vehicleType,
    dayType: job.dayType,
    timeBand: job.timeBand,
    serviceDate: job.serviceDate,
    distanceMiles: job.distanceMiles,
    customerId: job.customerId,
    driverId: job.driverId,
  });
  await prisma.job.update({
    where: { id: jobId },
    data: {
      customerCharge: pricing.customerCharge,
      driverCost: pricing.driverCost,
      customerRateCardId: pricing.customerRateCardId,
      driverRateCardId: pricing.driverRateCardId,
    },
  });
}

export async function recalcJobPricing(jobId: string) {
  await recalc(jobId);
  revalidatePath(`/bookings/${jobId}`);
}

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

export async function allocateJob(jobId: string, formData: FormData) {
  const driverId = (formData.get("driverId") as string) || null;
  const vehicleIdRaw = (formData.get("vehicleId") as string) || null;

  // If a driver is chosen with no explicit vehicle, fall back to their default.
  let vehicleId = vehicleIdRaw;
  if (driverId && !vehicleId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    vehicleId = driver?.defaultVehicleId ?? null;
  }

  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  // Allocating moves BOOKED -> ALLOCATED; clearing a driver reverts to BOOKED.
  let status = job.status;
  if (driverId && job.status === JobStatus.BOOKED) status = JobStatus.ALLOCATED;
  if (!driverId && job.status === JobStatus.ALLOCATED) status = JobStatus.BOOKED;

  await prisma.job.update({
    where: { id: jobId },
    data: { driverId, vehicleId, status },
  });

  await recalc(jobId);
  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/allocation");
  revalidatePath("/");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  await prisma.job.update({ where: { id: jobId }, data: { status } });
  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/bookings");
  revalidatePath("/allocation");
  revalidatePath("/");
}

export async function cancelJob(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.CANCELLED },
  });
  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/bookings");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Stop progression
// ---------------------------------------------------------------------------

export async function updateStopStatus(
  stopId: string,
  jobId: string,
  status: StopStatus,
) {
  await prisma.stop.update({
    where: { id: stopId },
    data: {
      status,
      completedAt: status === StopStatus.COMPLETED ? new Date() : null,
    },
  });

  // Auto-advance the parent job: any stop touched -> ON_ROUTE; all done -> COMPLETED.
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { stops: true },
  });

  const allDone = job.stops.every(
    (s) => s.status === StopStatus.COMPLETED || s.status === StopStatus.FAILED,
  );
  const anyActive = job.stops.some(
    (s) => s.status === StopStatus.ARRIVED || s.status === StopStatus.COMPLETED,
  );

  let newStatus = job.status;
  if (allDone && job.status !== JobStatus.INVOICED) {
    newStatus = JobStatus.COMPLETED;
  } else if (
    anyActive &&
    (job.status === JobStatus.ALLOCATED || job.status === JobStatus.BOOKED)
  ) {
    newStatus = JobStatus.ON_ROUTE;
  }

  if (newStatus !== job.status) {
    await prisma.job.update({ where: { id: jobId }, data: { status: newStatus } });
  }

  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/");
}
