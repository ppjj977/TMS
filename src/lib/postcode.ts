// Postcode lookup + distance estimation.
//
// Uses the free postcodes.io API (no API key required). The lookup is behind a
// single function so a house-level address provider (getAddress.io,
// ideal-postcodes, …) can be slotted in later by changing only this file.
//
// All lookups fail soft: if the network is unavailable (or egress is blocked)
// they return null and the caller falls back to manual entry.

export interface GeoResult {
  postcode: string;
  latitude: number;
  longitude: number;
  town: string | null;
  region: string | null;
}

function apiBase(): string {
  return process.env.POSTCODES_API_BASE || "https://api.postcodes.io";
}

function normalise(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/** Look up a single UK postcode. Returns null if not found or unreachable. */
export async function lookupPostcode(postcode: string): Promise<GeoResult | null> {
  const pc = normalise(postcode);
  if (!pc) return null;
  try {
    const res = await fetch(`${apiBase()}/postcodes/${encodeURIComponent(pc)}`, {
      // Postcode → location is stable; cache for a day.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: any };
    const r = json.result;
    if (!r) return null;
    return {
      postcode: r.postcode ?? postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      town: r.admin_district ?? r.parish ?? r.admin_ward ?? null,
      region: r.region ?? r.country ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Street-level address lookup (optional provider)
// ---------------------------------------------------------------------------
//
// postcodes.io only resolves a postcode to its town/area + coordinates. To list
// individual street addresses you need a PAF-backed provider. We support
// getAddress.io when GETADDRESS_API_KEY is set; otherwise this returns an empty
// list and the app falls back to town-level lookup + manual entry.

export interface AddressResult {
  line1: string;
  line2: string | null;
  city: string | null;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
}

export async function lookupAddresses(postcode: string): Promise<AddressResult[]> {
  const key = process.env.GETADDRESS_API_KEY;
  const pc = normalise(postcode);
  if (!key || !pc) return [];
  try {
    const res = await fetch(
      `https://api.getaddress.io/find/${encodeURIComponent(pc)}?api-key=${encodeURIComponent(key)}&expand=true`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { latitude?: number; longitude?: number; addresses?: any[] };
    const lat = json.latitude ?? null;
    const lng = json.longitude ?? null;
    return (json.addresses ?? []).map((a) => {
      const fa: string[] = Array.isArray(a.formatted_address) ? a.formatted_address : [];
      return {
        line1: a.line_1 || fa[0] || "",
        line2: a.line_2 || fa[1] || null,
        city: a.town_or_city || null,
        postcode: pc,
        latitude: lat,
        longitude: lng,
      } as AddressResult;
    });
  } catch {
    return [];
  }
}

interface Point {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance between two points, in miles. */
export function haversineMiles(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// Roads aren't straight lines — scale the great-circle distance up to better
// approximate driving miles.
const ROAD_FACTOR = 1.3;

/** Total estimated road distance along an ordered list of geocoded points. */
export function routeDistanceMiles(points: (Point | null)[]): number {
  const valid = points.filter((p): p is Point => !!p);
  let total = 0;
  for (let i = 1; i < valid.length; i++) {
    total += haversineMiles(valid[i - 1], valid[i]);
  }
  return Math.round(total * ROAD_FACTOR * 10) / 10;
}
