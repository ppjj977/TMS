"use server";

import { lookupPostcode, lookupAddresses, GeoResult, AddressResult } from "@/lib/postcode";

/** Server action so client forms can resolve a postcode without exposing keys. */
export async function lookupPostcodeAction(
  postcode: string,
): Promise<GeoResult | null> {
  if (!postcode || postcode.trim().length < 4) return null;
  return lookupPostcode(postcode);
}

export interface PostcodeLookup {
  geo: GeoResult | null;
  addresses: AddressResult[];
}

/** Town/coords + (if a provider is configured) the list of street addresses. */
export async function lookupPostcodeFull(postcode: string): Promise<PostcodeLookup> {
  if (!postcode || postcode.trim().length < 4) return { geo: null, addresses: [] };
  const [geo, addresses] = await Promise.all([
    lookupPostcode(postcode),
    lookupAddresses(postcode),
  ]);
  return { geo, addresses };
}
