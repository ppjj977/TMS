"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lookupPostcode, routeDistanceMiles } from "@/lib/postcode";
import { classifyDay, classifyTimeBand, price } from "@/lib/pricing";
import { nextJobReference, nextQuoteNumber } from "@/lib/reference";
import { logJobEvent } from "@/lib/events";
import {
  JobEventType,
  QuoteStatus,
  RateCardKind,
  ServiceLevel,
  StopType,
  VehicleType,
} from "@prisma/client";

const inputSchema = z.object({
  customerId: z.string().trim().optional(),
  vehicleType: z.nativeEnum(VehicleType),
  serviceLevel: z.nativeEnum(ServiceLevel).default(ServiceLevel.SAMEDAY_STANDARD),
  collectionPostcode: z.string().trim().optional(),
  deliveryPostcode: z.string().trim().optional(),
  distanceMiles: z.coerce.number().min(0).default(0),
  drops: z.coerce.number().int().min(1).default(1),
  pieces: z.coerce.number().int().min(1).default(1),
});

type QuoteParams = z.infer<typeof inputSchema>;

function readParams(formData: FormData): QuoteParams {
  return inputSchema.parse({
    customerId: formData.get("customerId") || undefined,
    vehicleType: formData.get("vehicleType"),
    serviceLevel: formData.get("serviceLevel") || undefined,
    collectionPostcode: formData.get("collectionPostcode") || undefined,
    deliveryPostcode: formData.get("deliveryPostcode") || undefined,
    distanceMiles: formData.get("distanceMiles") || 0,
    drops: formData.get("drops") || 1,
    pieces: formData.get("pieces") || 1,
  });
}

// Shared compute: resolve distance (auto from postcodes if not given) and price.
async function compute(p: QuoteParams) {
  let distanceMiles = p.distanceMiles;
  if (distanceMiles === 0 && p.collectionPostcode && p.deliveryPostcode) {
    const [a, b] = await Promise.all([
      lookupPostcode(p.collectionPostcode),
      lookupPostcode(p.deliveryPostcode),
    ]);
    const est = routeDistanceMiles([
      a ? { latitude: a.latitude, longitude: a.longitude } : null,
      b ? { latitude: b.latitude, longitude: b.longitude } : null,
    ]);
    if (est > 0) distanceMiles = est;
  }

  const now = new Date();
  const result = await price({
    kind: RateCardKind.CUSTOMER,
    customerId: p.customerId || null,
    vehicleType: p.vehicleType,
    dayType: classifyDay(now),
    timeBand: classifyTimeBand(now),
    serviceDate: now,
    distanceMiles,
    drops: p.drops,
    pieces: p.pieces,
  });

  return { distanceMiles, result };
}

export interface QuoteEstimate {
  amount: number | null;
  distanceMiles: number;
  rateCardName: string | null;
  appliedMinimum: boolean;
}

/** Live calculator — returns an estimate without saving. */
export async function estimateQuote(formData: FormData): Promise<QuoteEstimate> {
  const p = readParams(formData);
  const { distanceMiles, result } = await compute(p);
  return {
    amount: result?.amount ?? null,
    distanceMiles,
    rateCardName: result?.rateCardName ?? null,
    appliedMinimum: result?.appliedMinimum ?? false,
  };
}

export async function createQuote(formData: FormData) {
  const p = readParams(formData);
  const { distanceMiles, result } = await compute(p);

  const customer = p.customerId
    ? await prisma.customer.findUnique({ where: { id: p.customerId } })
    : null;

  const quote = await prisma.quote.create({
    data: {
      reference: await nextQuoteNumber(),
      customerId: p.customerId || null,
      customerName: customer?.name ?? (formData.get("customerName") as string) ?? null,
      vehicleType: p.vehicleType,
      serviceLevel: p.serviceLevel,
      collectionPostcode: p.collectionPostcode?.toUpperCase(),
      deliveryPostcode: p.deliveryPostcode?.toUpperCase(),
      distanceMiles,
      drops: p.drops,
      pieces: p.pieces,
      amount: result?.amount ?? 0,
      rateCardName: result?.rateCardName ?? null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function setQuoteStatus(id: string, status: QuoteStatus) {
  await prisma.quote.update({ where: { id }, data: { status } });
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

/**
 * Convert a quote into a booking. Creates a BOOKED job with collection/delivery
 * stops from the quote's postcodes (addresses to be completed by the operator).
 */
export async function convertQuote(id: string) {
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id } });
  if (!quote.customerId) {
    redirect(`/quotes/${id}?error=nocustomer`);
  }

  const now = new Date();
  const dayType = classifyDay(now);
  const timeBand = classifyTimeBand(now);

  const cards = await price({
    kind: RateCardKind.CUSTOMER,
    customerId: quote.customerId,
    vehicleType: quote.vehicleType,
    dayType,
    timeBand,
    serviceDate: now,
    distanceMiles: quote.distanceMiles,
    drops: quote.drops,
    pieces: quote.pieces,
  });

  const job = await prisma.job.create({
    data: {
      reference: await nextJobReference(),
      customerId: quote.customerId,
      vehicleType: quote.vehicleType,
      serviceLevel: quote.serviceLevel,
      serviceDate: now,
      dayType,
      timeBand,
      distanceMiles: quote.distanceMiles,
      pieces: quote.pieces,
      customerCharge: cards?.amount ?? quote.amount,
      customerRateCardId: cards?.rateCardId ?? null,
      reference_notes: `Converted from quote ${quote.reference}`,
      stops: {
        create: [
          {
            sequence: 1,
            type: StopType.COLLECTION,
            addressLine1: "To be confirmed",
            postcode: (quote.collectionPostcode ?? "").toUpperCase() || "TBC",
          },
          {
            sequence: 2,
            type: StopType.DELIVERY,
            addressLine1: "To be confirmed",
            postcode: (quote.deliveryPostcode ?? "").toUpperCase() || "TBC",
          },
        ],
      },
    },
  });

  await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.CONVERTED, convertedJobId: job.id },
  });
  await logJobEvent(job.id, JobEventType.CREATED, `Created from quote ${quote.reference}`, "system");

  revalidatePath("/quotes");
  revalidatePath("/bookings");
  redirect(`/bookings/${job.id}`);
}
