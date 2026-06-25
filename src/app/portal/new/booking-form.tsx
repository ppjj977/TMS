"use client";

import { useState } from "react";
import { createPortalBooking } from "@/actions/bookings";
import { lookupPostcodeAction } from "@/actions/postcode";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  serviceLevels,
  serviceLevelLabels,
  stopTypes,
  stopTypeLabels,
  vehicleTypes,
  vehicleTypeLabels,
} from "@/lib/format";

interface AddressOption {
  id: string;
  label: string;
  name: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postcode: string;
  contactName: string | null;
  contactPhone: string | null;
}

let key = 0;
const newStop = (type = "DELIVERY") => ({ key: key++, type });

export function PortalBookingForm({ addresses }: { addresses: AddressOption[] }) {
  const [stops, setStops] = useState([newStop("COLLECTION"), newStop("DELIVERY")]);

  return (
    <form action={createPortalBooking} className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Your reference / PO">
            <Input name="customerRef" placeholder="e.g. PO-12345" />
          </Field>
          <Field label="Service level" required>
            <Select
              name="serviceLevel"
              defaultValue="SAMEDAY_STANDARD"
              options={serviceLevels.map((s) => ({ value: s, label: serviceLevelLabels[s] }))}
            />
          </Field>
          <Field label="Vehicle type" required>
            <Select
              name="vehicleType"
              required
              options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))}
            />
          </Field>
          <Field label="Collection date &amp; time" required>
            <Input type="datetime-local" name="serviceDate" required />
          </Field>
          <Field label="Pieces">
            <Input type="number" min="1" name="pieces" defaultValue="1" />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" min="0" name="weightKg" defaultValue="0" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>
        </div>
        {/* Distance is auto-estimated from the postcodes server-side. */}
        <input type="hidden" name="distanceMiles" value="0" />
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Stops</h2>
          <Button type="button" variant="secondary" onClick={() => setStops((s) => [...s, newStop()])}>
            + Add stop
          </Button>
        </div>
        <div className="space-y-4">
          {stops.map((stop, idx) => (
            <PortalStop
              key={stop.key}
              index={idx}
              type={stop.type}
              addresses={addresses}
              canRemove={stops.length > 1}
              onRemove={() => setStops((s) => s.filter((r) => r.key !== stop.key))}
            />
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Place booking</Button>
      </div>
    </form>
  );
}

function PortalStop({
  index,
  type,
  addresses,
  canRemove,
  onRemove,
}: {
  index: number;
  type: string;
  addresses: AddressOption[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const [f, setF] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    contactName: "",
    contactPhone: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function applySaved(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setF({
      name: a.name ?? "",
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? "",
      city: a.city ?? "",
      postcode: a.postcode,
      contactName: a.contactName ?? "",
      contactPhone: a.contactPhone ?? "",
    });
  }

  async function lookup() {
    if (f.postcode.trim().length < 4) return;
    const r = await lookupPostcodeAction(f.postcode);
    if (r) setF((p) => ({ ...p, postcode: r.postcode, city: p.city || r.town || "" }));
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Stop {index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
        >
          Remove
        </button>
      </div>

      {addresses.length > 0 && (
        <div className="mb-3">
          <Field label="Use saved address">
            <Select
              defaultValue=""
              onChange={(e) => applySaved(e.target.value)}
              options={[
                { value: "", label: "— pick from address book —" },
                ...addresses.map((a) => ({ value: a.id, label: a.label })),
              ]}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Type" required>
          <Select
            name="stop_type"
            defaultValue={type}
            options={stopTypes.map((t) => ({ value: t, label: stopTypeLabels[t] }))}
          />
        </Field>
        <Field label="Site / company name">
          <Input name="stop_name" value={f.name} onChange={set("name")} />
        </Field>
        <Field label="Postcode" required>
          <div className="flex gap-2">
            <Input name="stop_postcode" required value={f.postcode} onChange={set("postcode")} />
            <Button type="button" variant="secondary" onClick={lookup} className="shrink-0">
              Find
            </Button>
          </div>
        </Field>
        <Field label="Address line 1" required>
          <Input name="stop_addressLine1" required value={f.addressLine1} onChange={set("addressLine1")} />
        </Field>
        <Field label="Address line 2">
          <Input name="stop_addressLine2" value={f.addressLine2} onChange={set("addressLine2")} />
        </Field>
        <Field label="City / town">
          <Input name="stop_city" value={f.city} onChange={set("city")} />
        </Field>
        <Field label="Contact name">
          <Input name="stop_contactName" value={f.contactName} onChange={set("contactName")} />
        </Field>
        <Field label="Contact phone">
          <Input name="stop_contactPhone" value={f.contactPhone} onChange={set("contactPhone")} />
        </Field>
        <Field label="Stop notes">
          <Input name="stop_notes" />
        </Field>
      </div>
    </div>
  );
}
