"use client";

import { useMemo, useState } from "react";
import { createBooking } from "@/actions/bookings";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { stopTypes, stopTypeLabels, vehicleTypes, vehicleTypeLabels } from "@/lib/format";

interface CustomerOption {
  id: string;
  name: string;
  contacts: { id: string; name: string }[];
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

  const contacts = useMemo(
    () => customers.find((c) => c.id === customerId)?.contacts ?? [],
    [customers, customerId],
  );

  function addStop() {
    setStops((s) => [...s, newStop()]);
  }
  function removeStop(key: number) {
    setStops((s) => (s.length > 1 ? s.filter((r) => r.key !== key) : s));
  }

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
            <Field label="Distance (miles)" hint="Used for per-mile pricing">
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
          <Button type="button" variant="secondary" onClick={addStop}>
            + Add stop
          </Button>
        </div>

        <div className="space-y-4">
          {stops.map((stop, idx) => (
            <div key={stop.key} className="rounded-md border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Stop {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeStop(stop.key)}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                  disabled={stops.length <= 1}
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Type" required>
                  <Select
                    name="stop_type"
                    defaultValue={stop.type}
                    options={stopTypes.map((t) => ({ value: t, label: stopTypeLabels[t] }))}
                  />
                </Field>
                <Field label="Site / company name">
                  <Input name="stop_name" />
                </Field>
                <Field label="Postcode" required>
                  <Input name="stop_postcode" required />
                </Field>
                <Field label="Address line 1" required>
                  <Input name="stop_addressLine1" required />
                </Field>
                <Field label="Address line 2">
                  <Input name="stop_addressLine2" />
                </Field>
                <Field label="City / town">
                  <Input name="stop_city" />
                </Field>
                <Field label="Contact name">
                  <Input name="stop_contactName" />
                </Field>
                <Field label="Contact phone">
                  <Input name="stop_contactPhone" />
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
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit">Create booking</Button>
      </div>
    </form>
  );
}
