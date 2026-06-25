import {
  DayType,
  Prisma,
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
}

type RateCardRow = Prisma.RateCardGetPayload<{}>;

/**
 * Score how specific a rate card is for the given inputs. A higher score means
 * a closer match. Targeting a specific customer/driver is the strongest signal,
 * then vehicle type, then day type, then time band. We weight them so that a
 * more specific dimension can never be outranked by several vaguer matches.
 */
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

  // Owner scope: a card targeting a specific customer/driver only applies to
  // that entity; a card with no owner is a global default.
  if (input.kind === RateCardKind.CUSTOMER) {
    if (card.customerId && card.customerId !== input.customerId) return false;
  } else {
    if (card.driverId && card.driverId !== input.driverId) return false;
  }

  if (card.vehicleType && card.vehicleType !== input.vehicleType) return false;
  if (card.dayType !== "ANY" && card.dayType !== input.dayType) return false;
  if (card.timeBand !== "ANY" && card.timeBand !== input.timeBand) return false;

  // Effective date window. Rate cards are dated, not timestamped: a card
  // effective "from" a given day applies to the whole of that day onward, so
  // we compare at day granularity rather than by exact timestamp.
  const serviceDay = startOfDay(input.serviceDate);
  if (startOfDay(card.effectiveFrom) > serviceDay) return false;
  if (card.effectiveTo && startOfDay(card.effectiveTo) < serviceDay) return false;

  return true;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Pick the best matching rate card, or null if none apply. */
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
  });

  const applicable = candidates.filter((c) => matches(c, input));
  if (applicable.length === 0) return null;

  applicable.sort((a, b) => {
    const diff = specificity(b) - specificity(a);
    if (diff !== 0) return diff;
    // Tie-break: most recently effective card wins.
    return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
  });

  return applicable[0];
}

/** Compute a price: max(distance * ratePerMile, minimumCharge). */
export async function price(input: PriceInputs): Promise<PriceResult | null> {
  const card = await selectRateCard(input);
  if (!card) return null;

  const byDistance = round2(input.distanceMiles * card.ratePerMile);
  const appliedMinimum = byDistance < card.minimumCharge;
  const amount = appliedMinimum ? round2(card.minimumCharge) : byDistance;

  return {
    amount,
    ratePerMile: card.ratePerMile,
    minimumCharge: card.minimumCharge,
    appliedMinimum,
    rateCardId: card.id,
    rateCardName: card.name,
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

/** Price both the customer revenue and driver cost legs of a job. */
export async function priceJob(args: {
  vehicleType: VehicleType;
  dayType: DayType;
  timeBand: TimeBand;
  serviceDate: Date;
  distanceMiles: number;
  customerId: string;
  driverId?: string | null;
}): Promise<JobPricing> {
  const customer = await price({
    kind: RateCardKind.CUSTOMER,
    customerId: args.customerId,
    vehicleType: args.vehicleType,
    dayType: args.dayType,
    timeBand: args.timeBand,
    serviceDate: args.serviceDate,
    distanceMiles: args.distanceMiles,
  });

  const driver = args.driverId
    ? await price({
        kind: RateCardKind.DRIVER,
        driverId: args.driverId,
        vehicleType: args.vehicleType,
        dayType: args.dayType,
        timeBand: args.timeBand,
        serviceDate: args.serviceDate,
        distanceMiles: args.distanceMiles,
      })
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

/** Classify a date into the day type used for rate-card matching. */
export function classifyDay(date: Date): DayType {
  const day = date.getDay();
  if (day === 0) return DayType.SUNDAY;
  if (day === 6) return DayType.SATURDAY;
  return DayType.WEEKDAY;
}

/** Classify a time into the band used for rate-card matching (08:00–18:00 = daytime). */
export function classifyTimeBand(date: Date): TimeBand {
  const hour = date.getHours();
  return hour >= 8 && hour < 18 ? TimeBand.DAYTIME : TimeBand.OUT_OF_HOURS;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
