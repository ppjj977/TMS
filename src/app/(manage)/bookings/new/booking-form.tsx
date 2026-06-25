"use client";

import { useMemo, useState } from "react";
import { createBooking } from "@/actions/bookings";
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
}

let stopKey = 0;
function newStop(type = "DELIVERY"): StopRow {
  return { key: stopKey++, type };
}

export function BookingForm({ customers }: { customers: CustomerOption[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [stops, setStops] = useState<StopRow[]>([
    newStop("COLLECTION"),
    newStop("DELIVERY"),
  ]);

  const selected = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );
  const contacts = selected?.contacts ?? [];
  const addresses = selected?.savedAddresses ?? [];

  return (
    <form action={createBooking} className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Booking details</h2>
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
              options={[
                { value: "", label: "— none —" },
                ...contacts.map((c) => ({ value: c.id, label: c.name })),
              ]}
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
          <Field label="Vehicle type" required>
            <Select
              name="vehicleType"
              required
              options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))}
            />
          </Field>
          <Field label="Service date &amp; time" required hint="Drives day/time rate selection">
            <Input type="datetime-local" name="serviceDate" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pieces">
              <Input type="number" min="1" name="pieces" defaultValue="1" />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" step="0.1" min="0" name="weightKg" defaultValue="0" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Distance (miles)" hint="0 = auto-estimate">
              <Input type="number" step="0.1" min="0" name="distanceMiles" defaultValue="0" />
            </Field>
            <Field label="Est. minutes">
              <Input type="number" min="0" name="estimatedMins" defaultValue="0" />
            </Field>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Operator notes">
            <Textarea name="notes" rows={2} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Stops (drops)</h2>
          <Button type="button" variant="secondary" onClick={() => setStops((s) => [...s, newStop()])}>
            + Add stop
          </Button>
        </div>

        <div className="space-y-4">
          {stops.map((stop, idx) => (
            <StopFields
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

      <div className="flex justify-end gap-2">
        <Button type="submit">Create booking</Button>
      </div>
    </form>
  );
}

function StopFields({
  index,
  type,
  addresses,
  canRemove,
  onRemove,
}: {
  index: number;
  type: string;
  addresses: SavedAddressOption[];
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
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");
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
    setStatus("loading");
    const r = await lookupPostcodeAction(f.postcode);
    if (r) {
      setF((p) => ({ ...p, postcode: r.postcode, city: p.city || r.town || "" }));
      setStatus("ok");
    } else setStatus("fail");
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
        <Field label="Postcode" required hint={statusHint(status)}>
          <div className="flex gap-2">
            <Input
              name="stop_postcode"
              required
              value={f.postcode}
              onChange={(e) => {
                set("postcode")(e);
                setStatus("idle");
              }}
            />
            <Button type="button" variant="secondary" onClick={lookup} className="shrink-0">
              {status === "loading" ? "…" : "Find"}
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
        <div />
        <Field label="Window from">
          <Input type="datetime-local" name="stop_windowFrom" />
        </Field>
        <Field label="Window to">
          <Input type="datetime-local" name="stop_windowTo" />
        </Field>
        <Field label="Stop notes">
          <Input name="stop_notes" />
        </Field>
      </div>
    </div>
  );
}

function statusHint(status: string): string | undefined {
  if (status === "ok") return "✓ Postcode found — town filled in";
  if (status === "fail") return "Postcode not found — enter manually";
  return undefined;
}
