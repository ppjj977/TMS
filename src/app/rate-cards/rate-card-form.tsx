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

export function RateCardForm({
  action,
  card,
  customers,
  drivers,
  defaults,
}: {
  action: (formData: FormData) => void;
  card?: RateCard;
  customers: Option[];
  drivers: Option[];
  defaults?: { kind?: string; customerId?: string; driverId?: string };
}) {
  const [kind, setKind] = useState<string>(card?.kind ?? defaults?.kind ?? "CUSTOMER");

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
      <div className="flex justify-end">
        <Button type="submit">{card ? "Save changes" : "Create rate card"}</Button>
      </div>
    </form>
  );
}
