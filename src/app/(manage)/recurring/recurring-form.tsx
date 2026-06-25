"use client";

import { useState } from "react";
import { createRecurring } from "@/actions/recurring";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { serviceLevels, serviceLevelLabels, stopTypes, stopTypeLabels, vehicleTypes, vehicleTypeLabels } from "@/lib/format";

let k = 0;
const newStop = (type = "DELIVERY") => ({ key: k++, type });
const DAYS: [string, string][] = [
  ["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"],
];

export function RecurringForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [stops, setStops] = useState([newStop("COLLECTION"), newStop("DELIVERY")]);

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">New standing job</h2>
      <form action={createRecurring} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Template name" required>
            <Input name="name" placeholder="e.g. Daily Acme → Bolton" required />
          </Field>
          <Field label="Customer" required>
            <Select name="customerId" required options={customers.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Vehicle type" required>
            <Select name="vehicleType" required options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))} />
          </Field>
          <Field label="Service level">
            <Select name="serviceLevel" defaultValue="SAMEDAY_STANDARD" options={serviceLevels.map((s) => ({ value: s, label: serviceLevelLabels[s] }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pieces"><Input type="number" min="1" name="pieces" defaultValue="1" /></Field>
            <Field label="Weight (kg)"><Input type="number" step="0.1" min="0" name="weightKg" defaultValue="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start hour"><Input type="number" min="0" max="23" name="startHour" defaultValue="9" /></Field>
            <Field label="Start min"><Input type="number" min="0" max="59" name="startMinute" defaultValue="0" /></Field>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Runs on</span>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" name={k} className="rounded border-slate-300" defaultChecked={k !== "sat" && k !== "sun"} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Stops</span>
            <Button type="button" variant="secondary" onClick={() => setStops((s) => [...s, newStop()])}>+ Add stop</Button>
          </div>
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div key={stop.key} className="rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Stop {idx + 1}</span>
                  <button type="button" onClick={() => setStops((s) => (s.length > 1 ? s.filter((r) => r.key !== stop.key) : s))} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select name="stop_type" defaultValue={stop.type} options={stopTypes.map((t) => ({ value: t, label: stopTypeLabels[t] }))} />
                  <Input name="stop_name" placeholder="Site name" />
                  <Input name="stop_postcode" placeholder="Postcode" required />
                  <Input name="stop_addressLine1" placeholder="Address line 1" required />
                  <Input name="stop_addressLine2" placeholder="Address line 2" />
                  <Input name="stop_city" placeholder="City" />
                  <Input name="stop_contactName" placeholder="Contact name" />
                  <Input name="stop_contactPhone" placeholder="Contact phone" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes"><Textarea name="notes" rows={2} /></Field>

        <div className="flex justify-end">
          <Button type="submit">Create standing job</Button>
        </div>
      </form>
    </Card>
  );
}
