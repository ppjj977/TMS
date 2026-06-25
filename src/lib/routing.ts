import { haversineMiles } from "./postcode";

// Live route/ETA estimation for the booking screen. Pure functions so they can
// run in the browser as the operator builds the run.

export const ROAD_FACTOR = 1.3; // straight-line → driving distance

export interface RouteProfile {
  urbanSpeedMph: number; // speed on short (town) legs
  motorwaySpeedMph: number; // speed on long (trunk/motorway) legs
  dwellMin: number; // minutes spent at each stop
}

export const DEFAULT_PROFILE: RouteProfile = {
  urbanSpeedMph: 18,
  motorwaySpeedMph: 55,
  dwellMin: 10,
};

// Speed for a single leg: short legs are town driving, long legs are mostly
// motorway. Between 3 and 25 miles we interpolate between the two — so a 2-mile
// hop is slow and a 60-mile leg runs at motorway speed.
const URBAN_BELOW = 3;
const MOTORWAY_ABOVE = 25;

export function legSpeed(miles: number, p: RouteProfile): number {
  if (miles <= URBAN_BELOW) return p.urbanSpeedMph;
  if (miles >= MOTORWAY_ABOVE) return p.motorwaySpeedMph;
  const t = (miles - URBAN_BELOW) / (MOTORWAY_ABOVE - URBAN_BELOW);
  return p.urbanSpeedMph + t * (p.motorwaySpeedMph - p.urbanSpeedMph);
}

// Resolve the effective routing profile: start from defaults, apply the vehicle
// type's profile, then any per-vehicle overrides (null = inherit).
export function resolveProfile(
  typeProfile?: Partial<RouteProfile> | null,
  vehicleOverride?: {
    urbanSpeedMph?: number | null;
    motorwaySpeedMph?: number | null;
    dwellMin?: number | null;
  } | null,
): RouteProfile {
  const p: RouteProfile = { ...DEFAULT_PROFILE, ...(typeProfile ?? {}) } as RouteProfile;
  if (vehicleOverride?.urbanSpeedMph != null) p.urbanSpeedMph = vehicleOverride.urbanSpeedMph;
  if (vehicleOverride?.motorwaySpeedMph != null) p.motorwaySpeedMph = vehicleOverride.motorwaySpeedMph;
  if (vehicleOverride?.dwellMin != null) p.dwellMin = vehicleOverride.dwellMin;
  return p;
}

export interface RoutePoint {
  lat: number | null;
  lng: number | null;
  requested?: Date | null;
  deadline?: Date | null;
}

export interface LegResult {
  index: number;
  travelMiles: number;
  travelMin: number;
  arrival: Date | null;
  late: boolean;
  lateMin: number;
  waitMin: number;
}

export interface Itinerary {
  legs: LegResult[];
  totalMiles: number;
  totalMin: number;
  anyInfeasible: boolean;
}

export function computeItinerary(
  points: RoutePoint[],
  start: Date | null,
  profile: RouteProfile = DEFAULT_PROFILE,
): Itinerary {
  const legs: LegResult[] = [];
  let totalMiles = 0;
  let cursor = start ? new Date(start) : null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    let travelMiles = 0;
    let travelMin = 0;

    if (i > 0) {
      const prev = points[i - 1];
      if (prev.lat != null && prev.lng != null && p.lat != null && p.lng != null) {
        travelMiles =
          Math.round(
            haversineMiles(
              { latitude: prev.lat, longitude: prev.lng },
              { latitude: p.lat, longitude: p.lng },
            ) *
              ROAD_FACTOR *
              10,
          ) / 10;
        travelMin = Math.round((travelMiles / legSpeed(travelMiles, profile)) * 60);
      }
      totalMiles += travelMiles;
      if (cursor) cursor = new Date(cursor.getTime() + (profile.dwellMin + travelMin) * 60000);
    }

    let waitMin = 0;
    if (cursor && p.requested && cursor < p.requested) {
      waitMin = Math.round((p.requested.getTime() - cursor.getTime()) / 60000);
      cursor = new Date(p.requested);
    }

    const arrival = cursor ? new Date(cursor) : null;
    let late = false;
    let lateMin = 0;
    if (arrival && p.deadline && arrival > p.deadline) {
      late = true;
      lateMin = Math.round((arrival.getTime() - p.deadline.getTime()) / 60000);
    }

    legs.push({ index: i, travelMiles, travelMin, arrival, late, lateMin, waitMin });
  }

  const totalMin = start && cursor ? Math.round((cursor.getTime() - start.getTime()) / 60000) : 0;

  return {
    legs,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalMin,
    anyInfeasible: legs.some((l) => l.late),
  };
}
