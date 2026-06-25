import { haversineMiles } from "./postcode";

// Live route/ETA estimation for the booking screen. Pure functions so they can
// run in the browser as the operator builds the run.

export const ROAD_FACTOR = 1.3; // straight-line → driving distance
export const DEFAULT_SPEED_MPH = 30; // mixed urban/A-road average
export const DEFAULT_DWELL_MIN = 10; // time spent at each stop

export interface RoutePoint {
  lat: number | null;
  lng: number | null;
  requested?: Date | null; // target arrival
  deadline?: Date | null; // latest acceptable arrival
}

export interface LegResult {
  index: number;
  travelMiles: number;
  travelMin: number;
  arrival: Date | null;
  late: boolean; // arrival after deadline
  lateMin: number; // minutes past deadline (0 if ok)
  waitMin: number; // minutes waiting if we'd arrive before the requested time
}

export interface Itinerary {
  legs: LegResult[];
  totalMiles: number;
  totalMin: number; // total elapsed from start to last stop completion
  anyInfeasible: boolean;
}

export function computeItinerary(
  points: RoutePoint[],
  start: Date | null,
  opts: { speedMph?: number; dwellMin?: number } = {},
): Itinerary {
  const speed = opts.speedMph ?? DEFAULT_SPEED_MPH;
  const dwell = opts.dwellMin ?? DEFAULT_DWELL_MIN;

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
        travelMin = Math.round((travelMiles / speed) * 60);
      }
      totalMiles += travelMiles;
      // Advance the clock: dwell at the previous stop + travel to this one.
      if (cursor) cursor = new Date(cursor.getTime() + (dwell + travelMin) * 60000);
    }

    // If we'd arrive before the requested time, we wait until then.
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

  const totalMin =
    start && cursor ? Math.round((cursor.getTime() - start.getTime()) / 60000) : 0;

  return {
    legs,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalMin,
    anyInfeasible: legs.some((l) => l.late),
  };
}
