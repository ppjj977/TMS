"use client";

import { useState } from "react";
import { createQuote, estimateQuote, QuoteEstimate } from "@/actions/quotes";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { miles, money, serviceLevels, serviceLevelLabels, vehicleTypes, vehicleTypeLabels } from "@/lib/format";

interface CustomerOption {
  id: string;
  name: string;
}

export function QuoteForm({ customers }: { customers: CustomerOption[] }) {
  const [estimate, setEstimate] = useState<QuoteEstimate | null>(null);
  const [calculating, setCalculating] = useState(false);

  async function calculate(form: HTMLFormElement) {
    setCalculating(true);
    try {
      setEstimate(await estimateQuote(new FormData(form)));
    } finally {
      setCalculating(false);
    }
  }

  return (
    <form action={createQuote} className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quote details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" hint="Leave blank for an ad-hoc quote">
            <Select
              name="customerId"
              options={[
                { value: "", label: "— ad-hoc / no account —" },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Field label="Vehicle type" required>
            <Select
              name="vehicleType"
              required
              options={vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))}
            />
          </Field>
          <Field label="Service level">
            <Select
              name="serviceLevel"
              defaultValue="SAMEDAY_STANDARD"
              options={serviceLevels.map((s) => ({ value: s, label: serviceLevelLabels[s] }))}
            />
          </Field>
          <Field label="Collection postcode">
            <Input name="collectionPostcode" placeholder="e.g. M17 1AB" />
          </Field>
          <Field label="Delivery postcode">
            <Input name="deliveryPostcode" placeholder="e.g. LS12 2AA" />
          </Field>
          <Field label="Distance (miles)" hint="0 = auto from postcodes">
            <Input type="number" step="0.1" min="0" name="distanceMiles" defaultValue="0" />
          </Field>
          <Field label="Drops" hint="Number of delivery points">
            <Input type="number" min="1" name="drops" defaultValue="1" />
          </Field>
          <Field label="Pieces">
            <Input type="number" min="1" name="pieces" defaultValue="1" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <Textarea name="notes" rows={2} />
          </Field>
        </div>
      </Card>

      {/* Live estimate */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm text-slate-500">Estimated price</div>
          {estimate ? (
            estimate.amount != null ? (
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight text-slate-900 tnum">
                  {money(estimate.amount)}
                </span>
                <span className="text-sm text-slate-500">
                  {miles(estimate.distanceMiles)} · {estimate.rateCardName ?? "no rate card"}
                  {estimate.appliedMinimum ? " · min charge" : ""}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-sm text-amber-600">
                No matching customer rate card — set one up or pick a customer.
              </div>
            )
          ) : (
            <div className="mt-1 text-sm text-slate-400">Click Calculate to price this quote.</div>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={calculating}
          onClick={(e) => calculate((e.currentTarget as HTMLButtonElement).form!)}
        >
          {calculating ? "Calculating…" : "Calculate"}
        </Button>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Save quote</Button>
      </div>
    </form>
  );
}
