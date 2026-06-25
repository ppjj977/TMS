import {
  DayType,
  Prisma,
  RateBandType,
  RateCardKind,
  TimeBand,
  VehicleType,
} from "@prisma/client";
import { prisma } from "./prisma";

export interface PriceInputs {
  kind: RateCardKind;
  vehicleType: VehicleType;
  dayType: DayType;
  timeBand: TimeBand;
  serviceDate: Date;
  distanceMiles: number;
  drops?: number; // number of delivery drops
  pieces?: number; // number of pieces
  customerId?: string | null;
  driverId?: string | null;
}

export interface PriceResult {
  amount: number;
  ratePerMile: number;
  minimumCharge: number;
  appliedMinimum: boolean;
  rateCardId: string;
  rateCardName: string;
  breakdown: {
    distance: number;
    drops: number;
    pieces: number;
    retailUplift: number;
  };
}

// Rate card with its bands loaded.
type RateCardRow = Prisma.RateCardGetPayload<{ include: { bands: true } }>;

function specificity(card: RateCardRow): number {
  let score = 0;
  if (card.customerId || card.driverId) score += 8;
  if (card.vehicleType) score += 4;
  if (card.dayType !== "ANY") score += 2;
  if (card.timeBand !== "ANY") score += 1;
  return score;
}

function matches(card: RateCardRow, input: PriceInputs): boolean {
  if (card.kind !== input.kind) return false;
  if (!card.active) return false;

  if (input.kind === RateCardKind.CUSTOMER) {
    if (card.customerId && card.customerId !== input.customerId) return false;
  } else {
    if (card.driverId && card.driverId !== input.driverId) return false;
  }

  if (card.vehicleType && card.vehicleType !== input.vehicleType) return false;
  if (card.dayType !== "ANY" && card.dayType !== input.dayType) return false;
  if (card.timeBand !== "ANY" && card.timeBand !== input.timeBand) return false;

  const serviceDay = startOfDay(input.serviceDate);
  if (startOfDay(card.effectiveFrom) > serviceDay) return false;
  if (card.effectiveTo && startOfDay(card.effectiveTo) < serviceDay) return false;

  return true;
}

export async function selectRateCard(
  input: PriceInputs,
): Promise<RateCardRow | null> {
  const candidates = await prisma.rateCard.findMany({
    where: {
      kind: input.kind,
      active: true,
      ...(input.kind === RateCardKind.CUSTOMER
        ? { OR: [{ customerId: input.customerId ?? undefined }, { customerId: null }] }
        : { OR: [{ driverId: input.driverId ?? undefined }, { driverId: null }] }),
    },
    include: { bands: true },
  });

  const applicable = candidates.filter((c) => matches(c, input));
  if (applicable.length === 0) return null;

  applicable.sort((a, b) => {
    const diff = specificity(b) - specificity(a);
    if (diff !== 0) return diff;
    return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
  });

  return applicable[0];
}

// Find the per-unit rate for a quantity within a band type, or null if no band
// covers it.
function bandRate(card: RateCardRow, type: RateBandType, qty: number): number | null {
  const band = card.bands
    .filter((b) => b.type === type)
    .find((b) => qty >= b.minValue && qty <= b.maxValue);
  return band ? band.rate : null;
}

/**
 * Compute a price.
 *   distance charge = miles × (banded £/mile if a DISTANCE band matches, else ratePerMile)
 *   drop charge     = drops × £/drop  (only if a DROP band matches)
 *   piece charge    = pieces × £/piece (only if a PIECE band matches)
 * subtotal is floored at minimumCharge, then a retail % uplift is applied.
 */
export async function price(input: PriceInputs): Promise<PriceResult | null> {
  const card = await selectRateCard(input);
  if (!card) return null;

  const miles = input.distanceMiles;
  const drops = input.drops ?? 0;
  const pieces = input.pieces ?? 0;

  const distRate = bandRate(card, RateBandType.DISTANCE, miles);
  const distanceCharge = round2(miles * (distRate ?? card.ratePerMile));

  const dropRate = bandRate(card, RateBandType.DROP, drops);
  const dropCharge = dropRate != null ? round2(drops * dropRate) : 0;

  const pieceRate = bandRate(card, RateBandType.PIECE, pieces);
  const pieceCharge = pieceRate != null ? round2(pieces * pieceRate) : 0;

  const subtotal = round2(distanceCharge + dropCharge + pieceCharge);
  const appliedMinimum = subtotal < card.minimumCharge;
  const floored = appliedMinimum ? round2(card.minimumCharge) : subtotal;

  const retailUplift = card.retailPct ? round2(floored * (card.retailPct / 100)) : 0;
  const amount = round2(floored + retailUplift);

  return {
    amount,
    ratePerMile: distRate ?? card.ratePerMile,
    minimumCharge: card.minimumCharge,
    appliedMinimum,
    rateCardId: card.id,
    rateCardName: card.name,
    breakdown: {
      distance: distanceCharge,
      drops: dropCharge,
      pieces: pieceCharge,
      retailUplift,
    },
  };
}

export interface JobPricing {
  customerCharge: number;
  driverCost: number;
  customerRateCardId: string | null;
  driverRateCardId: string | null;
  margin: number;
  marginPct: number;
}

export async function priceJob(args: {
  vehicleType: VehicleType;
  dayType: DayType;
  timeBand: TimeBand;
  serviceDate: Date;
  distanceMiles: number;
  drops?: number;
  pieces?: number;
  customerId: string;
  driverId?: string | null;
}): Promise<JobPricing> {
  const common = {
    vehicleType: args.vehicleType,
    dayType: args.dayType,
    timeBand: args.timeBand,
    serviceDate: args.serviceDate,
    distanceMiles: args.distanceMiles,
    drops: args.drops,
    pieces: args.pieces,
  };

  const customer = await price({
    kind: RateCardKind.CUSTOMER,
    customerId: args.customerId,
    ...common,
  });

  const driver = args.driverId
    ? await price({ kind: RateCardKind.DRIVER, driverId: args.driverId, ...common })
    : null;

  const customerCharge = customer?.amount ?? 0;
  const driverCost = driver?.amount ?? 0;
  const margin = round2(customerCharge - driverCost);
  const marginPct = customerCharge > 0 ? round2((margin / customerCharge) * 100) : 0;

  return {
    customerCharge,
    driverCost,
    customerRateCardId: customer?.rateCardId ?? null,
    driverRateCardId: driver?.rateCardId ?? null,
    margin,
    marginPct,
  };
}

export function classifyDay(date: Date): DayType {
  const day = date.getDay();
  if (day === 0) return DayType.SUNDAY;
  if (day === 6) return DayType.SATURDAY;
  return DayType.WEEKDAY;
}

export function classifyTimeBand(date: Date): TimeBand {
  const hour = date.getHours();
  return hour >= 8 && hour < 18 ? TimeBand.DAYTIME : TimeBand.OUT_OF_HOURS;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
