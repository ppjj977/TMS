"use client";

import { useState } from "react";
import { RateCard } from "@prisma/client";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import {
  dayTypes,
  dayTypeLabels,
  rateCardKinds,
  rateCardKindLabels,
  timeBands,
  timeBandLabels,
  vehicleTypes,
  vehicleTypeLabels,
} from "@/lib/format";
import { toDateInput } from "@/lib/format";

interface Option {
  id: string;
  name: string;
}

interface BandRow {
  key: number;
  type: string;
  minValue: number;
  maxValue: number;
  rate: number;
}

const bandTypeOptions = [
  { value: "DISTANCE", label: "Distance (per mile)" },
  { value: "DROP", label: "Drops (per drop)" },
  { value: "PIECE", label: "Pieces (per piece)" },
];

let bandKey = 0;

export function RateCardForm({
  action,
  card,
  customers,
  drivers,
  defaults,
}: {
  action: (formData: FormData) => void;
  card?: RateCard & {
    bands?: { type: string; minValue: number; maxValue: number; rate: number }[];
  };
  customers: Option[];
  drivers: Option[];
  defaults?: { kind?: string; customerId?: string; driverId?: string };
}) {
  const [kind, setKind] = useState<string>(card?.kind ?? defaults?.kind ?? "CUSTOMER");
  const [bands, setBands] = useState<BandRow[]>(
    (card?.bands ?? []).map((b) => ({ key: bandKey++, ...b })),
  );

  function addBand() {
    setBands((b) => [...b, { key: bandKey++, type: "DISTANCE", minValue: 0, maxValue: 9999, rate: 0 }]);
  }
  function removeBand(key: number) {
    setBands((b) => b.filter((r) => r.key !== key));
  }

  return (
    <form action={action} className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Kind" required hint="Customer = revenue, Driver = cost">
            <Select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={rateCardKinds.map((k) => ({ value: k, label: rateCardKindLabels[k] }))}
            />
          </Field>
          <Field label="Name" required>
            <Input name="name" defaultValue={card?.name ?? ""} placeholder="e.g. Standard van rate" required />
          </Field>
          <div />

          {kind === "CUSTOMER" ? (
            <Field label="Customer" hint="Leave blank for a default that applies to all customers">
              <Select
                name="customerId"
                defaultValue={card?.customerId ?? defaults?.customerId ?? ""}
                options={[
                  { value: "", label: "— default (all customers) —" },
                  ...customers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </Field>
          ) : (
            <Field label="Driver" hint="Leave blank for a default that applies to all drivers">
              <Select
                name="driverId"
                defaultValue={card?.driverId ?? defaults?.driverId ?? ""}
                options={[
                  { value: "", label: "— default (all drivers) —" },
                  ...drivers.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </Field>
          )}

          <Field label="Vehicle type" hint="Leave as Any to match all">
            <Select
              name="vehicleType"
              defaultValue={card?.vehicleType ?? ""}
              options={[
                { value: "", label: "Any vehicle type" },
                ...vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] })),
              ]}
            />
          </Field>
          <div />

          <Field label="Day type">
            <Select
              name="dayType"
              defaultValue={card?.dayType ?? "ANY"}
              options={dayTypes.map((d) => ({ value: d, label: dayTypeLabels[d] }))}
            />
          </Field>
          <Field label="Time band">
            <Select
              name="timeBand"
              defaultValue={card?.timeBand ?? "ANY"}
              options={timeBands.map((t) => ({ value: t, label: timeBandLabels[t] }))}
            />
          </Field>
          <div />

          <Field label="Rate per mile (£)" required>
            <Input type="number" step="0.01" min="0" name="ratePerMile" defaultValue={card?.ratePerMile ?? ""} required />
          </Field>
          <Field label="Minimum charge (£)">
            <Input type="number" step="0.01" min="0" name="minimumCharge" defaultValue={card?.minimumCharge ?? 0} />
          </Field>
          <div />

          <Field label="Waiting per hour (£)">
            <Input type="number" step="0.01" min="0" name="waitingPerHour" defaultValue={card?.waitingPerHour ?? 0} />
          </Field>
          <Field label="Retail uplift (%)" hint="Applied on top of the computed charge">
            <Input type="number" step="0.1" min="0" name="retailPct" defaultValue={card?.retailPct ?? 0} />
          </Field>
          <div />

          <Field label="Effective from" required>
            <Input
              type="date"
              name="effectiveFrom"
              defaultValue={toDateInput(card?.effectiveFrom) || toDateInput(new Date())}
              required
            />
          </Field>
          <Field label="Effective to" hint="Blank = open-ended">
            <Input type="date" name="effectiveTo" defaultValue={toDateInput(card?.effectiveTo)} />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
            <input type="checkbox" name="active" defaultChecked={card?.active ?? true} className="rounded border-gray-300" />
            Active
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Rate bands (optional)</h2>
          <Button type="button" variant="secondary" onClick={addBand}>+ Add band</Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Tiered pricing by quantity. A <strong>Distance</strong> band sets £/mile for miles in
          its range (overrides the flat per-mile above). <strong>Drop</strong> and{" "}
          <strong>Piece</strong> bands add a per-drop / per-piece charge. Leave empty to use the
          simple per-mile rate.
        </p>

        {bands.length === 0 ? (
          <p className="text-sm text-slate-400">No bands — using flat per-mile pricing.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span className="col-span-4">Type</span>
              <span className="col-span-2">Min</span>
              <span className="col-span-2">Max</span>
              <span className="col-span-3">Rate (£/unit)</span>
              <span className="col-span-1" />
            </div>
            {bands.map((b) => (
              <div key={b.key} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-4">
                  <Select
                    name="band_type"
                    defaultValue={b.type}
                    options={bandTypeOptions}
                  />
                </div>
                <Input className="col-span-2" type="number" step="0.1" name="band_min" defaultValue={b.minValue} />
                <Input className="col-span-2" type="number" step="0.1" name="band_max" defaultValue={b.maxValue} />
                <Input className="col-span-3" type="number" step="0.01" name="band_rate" defaultValue={b.rate} />
                <button
                  type="button"
                  onClick={() => removeBand(b.key)}
                  className="col-span-1 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{card ? "Save changes" : "Create rate card"}</Button>
      </div>
    </form>
  );
}
