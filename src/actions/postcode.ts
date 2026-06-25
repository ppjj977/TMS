"use server";

import { lookupPostcode, GeoResult } from "@/lib/postcode";

/** Server action so client forms can resolve a postcode without exposing keys. */
export async function lookupPostcodeAction(
  postcode: string,
): Promise<GeoResult | null> {
  if (!postcode || postcode.trim().length < 4) return null;
  return lookupPostcode(postcode);
}
