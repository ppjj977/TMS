"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextJobReference } from "@/lib/reference";
import { classifyDay, classifyTimeBand, outcode, priceJob } from "@/lib/pricing";
import { evaluateAutoSupplements, recomputeJobCharge } from "@/lib/supplements";
import { lookupPostcode, routeDistanceMiles } from "@/lib/postcode";
import { computeItinerary, DEFAULT_PROFILE } from "@/lib/routing";
import { logJobEvent } from "@/lib/events";
import { advanceJobFromStops, recomputeDeadlineRisk } from "@/lib/jobflow";
import { notifyAllocation, notifyBookingConfirmation, notifyCompletion } from "@/lib/notify";
import { getCurrentUser } from "@/lib/auth";
import {
  JobEventType,
  JobStatus,
  ServiceLevel,
  StopStatus,
  StopType,
  VehicleType,
} from "@prisma/client";

async function actorName(): Promise<string> {
  const user = await getCurrentUser();
  return user?.name ?? "system";
}

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
  serviceLevel: z.nativeEnum(ServiceLevel).default(ServiceLevel.SAMEDAY_STANDARD),
  serviceDate: z.string().trim().min(1, "Service date is required"),
  distanceMiles: z.coerce.number().min(0).default(0),
  estimatedMins: z.coerce.number().int().min(0).default(0),
  pieces: z.coerce.number().int().min(1).default(1),
  weightKg: z.coerce.number().min(0).default(0),
  customerRef: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// Shared booking-creation core used by both the operator screen and the
// customer portal. Returns the new job id; callers handle redirects.
async function createJobCore(
  formData: FormData,
  overrides: { customerId?: string } = {},
): Promise<string> {
  const data = bookingSchema.parse({
    customerId: overrides.customerId ?? formData.get("customerId"),
    contactId: formData.get("contactId") || undefined,
    vehicleType: formData.get("vehicleType"),
    serviceLevel: formData.get("serviceLevel") || undefined,
    serviceDate: formData.get("serviceDate"),
    distanceMiles: formData.get("distanceMiles") || 0,
    estimatedMins: formData.get("estimatedMins") || 0,
    pieces: formData.get("pieces") || 1,
    weightKg: formData.get("weightKg") || 0,
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

  // Geocode each stop's postcode (fails soft to null if unreachable).
  const geos = await Promise.all(stops.map((s) => lookupPostcode(s.postcode)));

  // If the operator didn't enter a distance, estimate it from the route.
  let distanceMiles = data.distanceMiles;
  if (distanceMiles === 0) {
    const estimated = routeDistanceMiles(
      geos.map((g) => (g ? { latitude: g.latitude, longitude: g.longitude } : null)),
    );
    if (estimated > 0) distanceMiles = estimated;
  }

  const dropCount = stops.filter((s) => s.type === StopType.DELIVERY).length;

  // Origin/destination outward codes for fixed postcode→postcode pricing.
  const firstCollection = stops.find((s) => s.type === StopType.COLLECTION) ?? stops[0];
  const lastDelivery = [...stops].reverse().find((s) => s.type === StopType.DELIVERY) ?? stops[stops.length - 1];
  const fromOutcode = outcode(firstCollection?.postcode);
  const toOutcode = outcode(lastDelivery?.postcode);

  // Deadline feasibility: run the itinerary using the vehicle's routing profile.
  const profileRow = await prisma.vehicleTypeProfile.findUnique({
    where: { type: data.vehicleType },
  });
  const profile = profileRow
    ? {
        urbanSpeedMph: profileRow.urbanSpeedMph,
        motorwaySpeedMph: profileRow.motorwaySpeedMph,
        dwellMin: profileRow.dwellMin,
      }
    : DEFAULT_PROFILE;
  const itinerary = computeItinerary(
    stops.map((s, i) => ({
      lat: geos[i]?.latitude ?? null,
      lng: geos[i]?.longitude ?? null,
      requested: s.windowFrom ? new Date(s.windowFrom) : null,
      deadline: s.windowTo ? new Date(s.windowTo) : null,
    })),
    serviceDate,
    profile,
  );
  const deadlineRisk = itinerary.anyInfeasible;

  const pricing = await priceJob({
    vehicleType: data.vehicleType,
    dayType,
    timeBand,
    serviceDate,
    distanceMiles,
    drops: dropCount,
    pieces: data.pieces,
    customerId: data.customerId,
    fromOutcode,
    toOutcode,
  });

  // Auto supplements (out-of-hours, postcode zones) on top of the base charge.
  const autoSupps = await evaluateAutoSupplements({
    serviceDate,
    postcodes: stops.map((s) => s.postcode),
  });
  const baseCharge = pricing.customerCharge;
  const supTotal = autoSupps.reduce((s, x) => s + x.amount, 0);
  const customerCharge = Math.round((baseCharge + supTotal) * 100) / 100;

  const reference = await nextJobReference();

  const job = await prisma.job.create({
    data: {
      reference,
      customerId: data.customerId,
      contactId: data.contactId || null,
      vehicleType: data.vehicleType,
      serviceDate,
      serviceLevel: data.serviceLevel,
      dayType,
      timeBand,
      distanceMiles,
      estimatedMins: data.estimatedMins,
      pieces: data.pieces,
      weightKg: data.weightKg,
      deadlineRisk,
      customerRef: data.customerRef,
      reference_notes: data.notes,
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
          city: s.city || geos[i]?.town || null,
          postcode: s.postcode.toUpperCase(),
          latitude: geos[i]?.latitude ?? null,
          longitude: geos[i]?.longitude ?? null,
          contactName: s.contactName,
          contactPhone: s.contactPhone,
          windowFrom: s.windowFrom ? new Date(s.windowFrom) : null,
          windowTo: s.windowTo ? new Date(s.windowTo) : null,
          notes: s.notes,
        })),
      },
    },
  });

  await logJobEvent(job.id, JobEventType.CREATED, `Booking created (${stops.length} stops)`, await actorName());
  await notifyBookingConfirmation(job.id);

  revalidatePath("/bookings");
  revalidatePath("/");
  return job.id;
}

/** Operator-side booking creation. */
export async function createBooking(formData: FormData) {
  const jobId = await createJobCore(formData);
  redirect(`/bookings/${jobId}`);
}

/** Customer-portal booking: customer is forced to the logged-in account. */
export async function createPortalBooking(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.customerId) redirect("/login");
  const jobId = await createJobCore(formData, { customerId: user.customerId });
  revalidatePath("/portal");
  redirect(`/portal/${jobId}`);
}

// ---------------------------------------------------------------------------
// Pricing recompute (shared by allocation & edits)
// ---------------------------------------------------------------------------

async function recalc(jobId: string) {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });
  const dropCount = job.stops.filter((s) => s.type === StopType.DELIVERY).length;
  const firstCollection = job.stops.find((s) => s.type === StopType.COLLECTION) ?? job.stops[0];
  const lastDelivery = [...job.stops].reverse().find((s) => s.type === StopType.DELIVERY) ?? job.stops[job.stops.length - 1];
  const pricing = await priceJob({
    vehicleType: job.vehicleType,
    dayType: job.dayType,
    timeBand: job.timeBand,
    serviceDate: job.serviceDate,
    distanceMiles: job.distanceMiles,
    drops: dropCount,
    pieces: job.pieces,
    customerId: job.customerId,
    driverId: job.driverId,
    fromOutcode: outcode(firstCollection?.postcode),
    toOutcode: outcode(lastDelivery?.postcode),
  });
  await prisma.job.update({
    where: { id: jobId },
    data: {
      baseCharge: pricing.customerCharge,
      driverCost: pricing.driverCost,
      customerRateCardId: pricing.customerRateCardId,
      driverRateCardId: pricing.driverRateCardId,
    },
  });
  // Fold supplements into the customer charge.
  await recomputeJobCharge(jobId);
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

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { driver: true },
  });
  // Allocating moves BOOKED -> ALLOCATED; clearing a driver reverts to BOOKED.
  let status = job.status;
  if (driverId && job.status === JobStatus.BOOKED) status = JobStatus.ALLOCATED;
  if (!driverId && job.status === JobStatus.ALLOCATED) status = JobStatus.BOOKED;

  const newlyAllocated = !!driverId && driverId !== job.driverId;

  await prisma.job.update({
    where: { id: jobId },
    data: { driverId, vehicleId, status },
  });

  await recalc(jobId);
  // Re-check deadline feasibility using the allocated vehicle's profile.
  await recomputeDeadlineRisk(jobId);

  const actor = await actorName();
  if (!driverId && job.driverId) {
    await logJobEvent(jobId, JobEventType.UNALLOCATED, "Driver unassigned", actor);
  } else if (newlyAllocated) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    await logJobEvent(jobId, JobEventType.ALLOCATED, `Allocated to ${driver?.name ?? "driver"}`, actor);
    await notifyAllocation(jobId);
  }

  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/allocation");
  revalidatePath("/");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === status) return;

  await prisma.job.update({ where: { id: jobId }, data: { status } });
  await logJobEvent(
    jobId,
    JobEventType.STATUS_CHANGE,
    `Status ${job.status} → ${status}`,
    await actorName(),
  );
  if (status === JobStatus.COMPLETED) await notifyCompletion(jobId);

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
  await logJobEvent(jobId, JobEventType.STATUS_CHANGE, "Job cancelled", await actorName());
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
  const stop = await prisma.stop.update({
    where: { id: stopId },
    data: {
      status,
      completedAt: status === StopStatus.COMPLETED ? new Date() : null,
    },
  });

  const actor = await actorName();
  await logJobEvent(
    jobId,
    JobEventType.STOP_UPDATE,
    `Stop ${stop.sequence} (${stop.postcode}) marked ${status.toLowerCase()}`,
    actor,
  );

  await advanceJobFromStops(jobId, actor);

  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/driver");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Proof of delivery
// ---------------------------------------------------------------------------

const podSchema = z.object({
  podName: z.string().trim().min(1, "A name is required"),
  podNotes: z.string().trim().optional(),
  podSignature: z.string().trim().optional(), // base64 data URL
  podPhoto: z.string().trim().optional(),
});

export async function capturePod(stopId: string, jobId: string, formData: FormData) {
  const data = podSchema.parse({
    podName: formData.get("podName"),
    podNotes: formData.get("podNotes") || undefined,
    podSignature: formData.get("podSignature") || undefined,
    podPhoto: formData.get("podPhoto") || undefined,
  });

  const stop = await prisma.stop.update({
    where: { id: stopId },
    data: {
      status: StopStatus.COMPLETED,
      completedAt: new Date(),
      podName: data.podName,
      podNotes: data.podNotes,
      podSignature: data.podSignature,
      podPhoto: data.podPhoto,
    },
  });

  const actor = await actorName();
  await logJobEvent(
    jobId,
    JobEventType.POD_CAPTURED,
    `POD captured at stop ${stop.sequence} — signed by ${data.podName}`,
    actor,
  );

  await advanceJobFromStops(jobId, actor);

  revalidatePath(`/bookings/${jobId}`);
  revalidatePath("/driver");
  revalidatePath(`/driver/${jobId}`);
  revalidatePath("/");
}
