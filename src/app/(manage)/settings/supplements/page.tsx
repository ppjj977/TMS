import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAutoRule, deleteAutoRule } from "@/actions/supplements";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SupplementRulesPage() {
  const rules = await prisma.autoSupplementRule.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader
        title="Auto supplements"
        subtitle="Charges added automatically to bookings"
        action={<Link href="/settings" className="text-sm font-medium text-brand-600 hover:underline">← Company settings</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Rules</h2>
          {rules.length === 0 ? (
            <EmptyState message="No auto-supplement rules yet." />
          ) : (
            <div className="space-y-3">
              {rules.map((r) => (
                <Card key={r.id} className="flex items-start justify-between p-4">
                  <div>
                    <div className="font-medium text-slate-900">{r.name} · {money(r.amount)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {r.type === "OUT_OF_HOURS"
                        ? `Out of hours: before ${r.oohStartHour ?? "—"}:00 or from ${r.oohEndHour ?? "—"}:00${r.appliesWeekend ? " · weekends" : ""}`
                        : `Postcodes: ${r.outcodes ?? "—"}`}
                    </div>
                  </div>
                  <form action={deleteAutoRule.bind(null, r.id)}>
                    <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">New rule</h2>
          <Card className="p-5">
            <form action={createAutoRule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" required>
                  <Input name="name" placeholder="e.g. ULEZ" required />
                </Field>
                <Field label="Amount (£)" required>
                  <Input type="number" step="0.01" min="0" name="amount" required />
                </Field>
              </div>
              <Field label="Type" required>
                <Select
                  name="type"
                  options={[
                    { value: "OUT_OF_HOURS", label: "Out of hours (by time)" },
                    { value: "POSTCODE", label: "Postcode zone (e.g. ULEZ / congestion)" },
                  ]}
                />
              </Field>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Out-of-hours config</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Before hour" hint="e.g. 8 = before 08:00">
                    <Input type="number" min="0" max="23" name="oohStartHour" placeholder="8" />
                  </Field>
                  <Field label="From hour" hint="e.g. 18 = from 18:00">
                    <Input type="number" min="0" max="23" name="oohEndHour" placeholder="18" />
                  </Field>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" name="appliesWeekend" className="rounded border-slate-300" />
                  Also apply at weekends
                </label>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">Postcode-zone config</p>
                <Field label="Outward codes" hint="Comma-separated, e.g. EC1,EC2,WC1,WC2">
                  <Input name="outcodes" placeholder="EC1,EC2,WC1" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Add rule</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
