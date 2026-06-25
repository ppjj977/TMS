"use client";

import { useMemo, useState } from "react";
import { createBooking } from "@/actions/bookings";
import { lookupPostcodeAction } from "@/actions/postcode";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  serviceLevels,
  serviceLevelLabels,
  stopTypes,
  stopTypeLabels,
  vehicleTypes,
  vehicleTypeLabels,
} from "@/lib/format";
import { computeItinerary, DEFAULT_PROFILE, RouteProfile } from "@/lib/routing";
import { RouteMap } from "@/components/route-map";

export interface SavedAddressOption {
  id: string;
  label: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  contactName: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CustomerOption {
  id: string;
  name: string;
  contacts: { id: string; name: string }[];
  savedAddresses: SavedAddressOption[];
}

interface StopRow {
  key: number;
  type: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  contactName: string;
  contactPhone: string;
  requested: string; // datetime-local
  deadline: string; // datetime-local
  notes: string;
  lat: number | null;
  lng: number | null;
  geo: "idle" | "loading" | "ok" | "fail";
}

let stopKey = 0;
function newStop(type = "DELIVERY"): StopRow {
  return {
    key: stopKey++,
    type,
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    contactName: "",
    contactPhone: "",
    requested: "",
    deadline: "",
    notes: "",
    lat: null,
    lng: null,
    geo: "idle",
  };
}

const parseDT = (s: string) => (s ? new Date(s) : null);
const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export function BookingForm({
  customers,
  profiles,
}: {
  customers: CustomerOption[];
  profiles: Record<string, RouteProfile>;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [vehicleType, setVehicleType] = useState<string>(vehicleTypes[0]);
  const [serviceDate, setServiceDate] = useState("");
  const [stops, setStops] = useState<StopRow[]>([newStop("COLLECTION"), newStop("DELIVERY")]);

  const profile = profiles[vehicleType] ?? DEFAULT_PROFILE;

  const selected = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const contacts = selected?.contacts ?? [];
  const addresses = selected?.savedAddresses ?? [];

  function patch(key: number, p: Partial<StopRow>) {
    setStops((s) => s.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function addStop() {
    setStops((s) => [...s, newStop()]);
  }
  function removeStop(key: number) {
    setStops((s) => (s.length > 1 ? s.filter((r) => r.key !== key) : s));
  }
  function move(index: number, dir: -1 | 1) {
    setStops((s) => {
      const j = index + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }
  // Nearest-neighbour ordering of geocoded stops from the first; keeps the
  // first stop fixed and appends any un-located stops at the end.
  function optimise() {
    setStops((s) => {
      const geo = s.filter((x) => x.lat != null && x.lng != null);
      const rest = s.filter((x) => x.lat == null || x.lng == null);
      if (geo.length < 3) return s;
      const hav = (a: StopRow, b: StopRow) => {
        const R = 3958.8;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad((b.lat as number) - (a.lat as number));
        const dLon = toRad((b.lng as number) - (a.lng as number));
        const la1 = toRad(a.lat as number);
        const la2 = toRad(b.lat as number);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
      };
      const ordered = [geo[0]];
      const pool = geo.slice(1);
      while (pool.length) {
        const last = ordered[ordered.length - 1];
        let bi = 0;
        let bd = Infinity;
        pool.forEach((c, i) => {
          const d = hav(last, c);
          if (d < bd) {
            bd = d;
            bi = i;
          }
        });
        ordered.push(pool.splice(bi, 1)[0]);
      }
      return [...ordered, ...rest];
    });
  }

  async function geocode(key: number, postcode: string) {
    if (postcode.trim().length < 4) return;
    patch(key, { geo: "loading" });
    const r = await lookupPostcodeAction(postcode);
    if (r) {
      patch(key, {
        geo: "ok",
        postcode: r.postcode,
        lat: r.latitude,
        lng: r.longitude,
      });
      // fill town if empty
      setStops((s) => s.map((row) => (row.key === key && !row.city ? { ...row, city: r.town ?? "" } : row)));
    } else {
      patch(key, { geo: "fail", lat: null, lng: null });
    }
  }

  function applySaved(key: number, id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    patch(key, {
      name: a.name ?? "",
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? "",
      city: a.city ?? "",
      postcode: a.postcode,
      contactName: a.contactName ?? "",
      contactPhone: a.contactPhone ?? "",
      lat: a.latitude,
      lng: a.longitude,
      geo: a.latitude != null ? "ok" : "idle",
    });
  }

  // Live itinerary: ETAs from the service start across geocoded stops.
  const start = parseDT(serviceDate);
  const itinerary = useMemo(
    () =>
      computeItinerary(
        stops.map((s) => ({
          lat: s.lat,
          lng: s.lng,
          requested: parseDT(s.requested),
          deadline: parseDT(s.deadline),
        })),
        start,
        profile,
      ),
    [stops, serviceDate, profile],
  );

  const geocodedCount = stops.filter((s) => s.lat != null).length;

  const mapPoints = stops
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.lat != null && s.lng != null)
    .map(({ s, i }) => ({
      lat: s.lat as number,
      lng: s.lng as number,
      type: s.type as "COLLECTION" | "DELIVERY",
      seq: i + 1,
      late: itinerary.legs[i]?.late,
      label: `Stop ${i + 1} · ${s.postcode}`,
    }));

  return (
    <form action={createBooking} className="space-y-6">
      <input type="hidden" name="distanceMiles" value={itinerary.totalMiles || 0} />

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Booking details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" required>
            <Select
              name="customerId"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field label="Contact">
            <Select
              name="contactId"
              options={[{ value: "", label: "— none —" }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Field>
          <Field label="Customer reference / PO">
            <Input name="customerRef" placeholder="e.g. PO-12345" />
          </Field>
          <Field label="Service level" required>
            <Select
              name="serviceLevel"
              defaultValue="SAMEDAY_STANDARD"
              options={serviceLevels.map((s) => ({ value: s, label: serviceLevelLabels[s] }))}
            />
          </Field>
          <Field label="Vehicle type" required hint="Sets routing speeds & dwell">
            <Select
              name="vehicleType"
              required
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))}
            />
          </Field>
          <Field label="Start (date &amp; time)" required hint="When the run begins — drives ETAs & rates">
            <Input
              type="datetime-local"
              name="serviceDate"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </Field>
          <Field label="Pieces">
            <Input type="number" min="1" name="pieces" defaultValue="1" />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" min="0" name="weightKg" defaultValue="0" />
          </Field>
          <Field label="Est. minutes (auto)">
            <Input type="number" name="estimatedMins" value={itinerary.totalMin || 0} readOnly />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Operator notes">
            <Textarea name="notes" rows={2} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stops */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Route ({stops.length} stops)</h2>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={optimise} disabled={geocodedCount < 3}>
                Optimise
              </Button>
              <Button type="button" variant="secondary" onClick={addStop}>+ Add stop</Button>
            </div>
          </div>
          {stops.map((stop, idx) => (
            <StopFields
              key={stop.key}
              index={idx}
              stop={stop}
              addresses={addresses}
              canRemove={stops.length > 1}
              canUp={idx > 0}
              canDown={idx < stops.length - 1}
              onPatch={(p) => patch(stop.key, p)}
              onRemove={() => removeStop(stop.key)}
              onMove={(dir) => move(idx, dir)}
              onGeocode={() => geocode(stop.key, stop.postcode)}
              onApplySaved={(id) => applySaved(stop.key, id)}
            />
          ))}
        </div>

        {/* Live itinerary */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Live route</h2>
          <Card className="sticky top-20 p-5">
            {!start ? (
              <p className="text-sm text-slate-500">Set a start time to calculate ETAs.</p>
            ) : geocodedCount < 2 ? (
              <p className="text-sm text-slate-500">
                Look up postcodes (the “Find” button) to plot the route. {geocodedCount}/{stops.length} located.
              </p>
            ) : (
              <>
                <div
                  className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset ${
                    itinerary.anyInfeasible
                      ? "bg-red-50 text-red-700 ring-red-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  }`}
                >
                  {itinerary.anyInfeasible
                    ? "⚠ Deadline not achievable — see flagged stops"
                    : "✓ All deadlines achievable"}
                </div>
                <div className="mb-4">
                  <RouteMap points={mapPoints} height={220} />
                </div>
                <ol className="space-y-3">
                  {stops.map((s, i) => {
                    const leg = itinerary.legs[i];
                    return (
                      <li key={s.key} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                            leg?.late ? "bg-red-500" : "bg-brand-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-700">
                              {stopTypeLabels[s.type as "COLLECTION" | "DELIVERY"]}
                              {s.postcode ? ` · ${s.postcode}` : ""}
                            </span>
                            <span className={`tnum ${leg?.late ? "text-red-600" : "text-slate-900"}`}>
                              ETA {fmtTime(leg?.arrival ?? null)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {i > 0 && leg ? `${leg.travelMiles} mi · ${leg.travelMin} min` : "start"}
                            {s.deadline && (
                              <>
                                {" · "}
                                <span className={leg?.late ? "font-medium text-red-600" : ""}>
                                  deadline {fmtTime(parseDT(s.deadline))}
                                  {leg?.late ? ` (${leg.lateMin}m late)` : ""}
                                </span>
                              </>
                            )}
                            {leg?.waitMin ? ` · wait ${leg.waitMin}m` : ""}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="tnum font-medium text-slate-900">
                    {itinerary.totalMiles} mi · {Math.floor(itinerary.totalMin / 60)}h {itinerary.totalMin % 60}m
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {vehicleTypeLabels[vehicleType as keyof typeof vehicleTypeLabels]}: {profile.urbanSpeedMph}–
                  {profile.motorwaySpeedMph} mph by leg + {profile.dwellMin} min/stop.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Create booking</Button>
      </div>
    </form>
  );
}

function StopFields({
  index,
  stop,
  addresses,
  canRemove,
  canUp,
  canDown,
  onPatch,
  onRemove,
  onMove,
  onGeocode,
  onApplySaved,
}: {
  index: number;
  stop: StopRow;
  addresses: SavedAddressOption[];
  canRemove: boolean;
  canUp: boolean;
  canDown: boolean;
  onPatch: (p: Partial<StopRow>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onGeocode: () => void;
  onApplySaved: (id: string) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          Stop {index + 1}
          {stop.geo === "ok" && <Badge color="green">located</Badge>}
          {stop.geo === "fail" && <Badge color="amber">not found</Badge>}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canUp}
            aria-label="Move up"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canDown}
            aria-label="Move down"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className="ml-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      {addresses.length > 0 && (
        <div className="mb-3">
          <Field label="Use saved address">
            <Select
              defaultValue=""
              onChange={(e) => onApplySaved(e.target.value)}
              options={[{ value: "", label: "— pick from address book —" }, ...addresses.map((a) => ({ value: a.id, label: a.label }))]}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Type" required>
          <Select
            name="stop_type"
            value={stop.type}
            onChange={(e) => onPatch({ type: e.target.value })}
            options={stopTypes.map((t) => ({ value: t, label: stopTypeLabels[t] }))}
          />
        </Field>
        <Field label="Site / company name">
          <Input name="stop_name" value={stop.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </Field>
        <Field label="Postcode" required>
          <div className="flex gap-2">
            <Input
              name="stop_postcode"
              required
              value={stop.postcode}
              onChange={(e) => onPatch({ postcode: e.target.value, geo: "idle", lat: null, lng: null })}
              onBlur={onGeocode}
            />
            <Button type="button" variant="secondary" onClick={onGeocode} className="shrink-0">
              {stop.geo === "loading" ? "…" : "Find"}
            </Button>
          </div>
        </Field>
        <Field label="Address line 1" required>
          <Input name="stop_addressLine1" required value={stop.addressLine1} onChange={(e) => onPatch({ addressLine1: e.target.value })} />
        </Field>
        <Field label="Address line 2">
          <Input name="stop_addressLine2" value={stop.addressLine2} onChange={(e) => onPatch({ addressLine2: e.target.value })} />
        </Field>
        <Field label="City / town">
          <Input name="stop_city" value={stop.city} onChange={(e) => onPatch({ city: e.target.value })} />
        </Field>
        <Field label="Contact name">
          <Input name="stop_contactName" value={stop.contactName} onChange={(e) => onPatch({ contactName: e.target.value })} />
        </Field>
        <Field label="Contact phone">
          <Input name="stop_contactPhone" value={stop.contactPhone} onChange={(e) => onPatch({ contactPhone: e.target.value })} />
        </Field>
        <div />
        <Field label="Requested time">
          <Input type="datetime-local" name="stop_windowFrom" value={stop.requested} onChange={(e) => onPatch({ requested: e.target.value })} />
        </Field>
        <Field label="Deadline" hint="Latest acceptable arrival">
          <Input type="datetime-local" name="stop_windowTo" value={stop.deadline} onChange={(e) => onPatch({ deadline: e.target.value })} />
        </Field>
        <Field label="Stop notes">
          <Input name="stop_notes" value={stop.notes} onChange={(e) => onPatch({ notes: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
