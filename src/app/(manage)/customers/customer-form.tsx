import { Customer } from "@prisma/client";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  accountStatuses,
  accountStatusLabels,
  accountTypes,
  accountTypeLabels,
  invoiceSchedules,
  invoiceScheduleLabels,
} from "@/lib/format";

export function CustomerForm({
  action,
  customer,
}: {
  action: (formData: FormData) => void;
  customer?: Customer;
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account code" required>
            <Input name="accountCode" defaultValue={customer?.accountCode ?? ""} required />
          </Field>
          <Field label="Name" required>
            <Input name="name" defaultValue={customer?.name ?? ""} required />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={customer?.status ?? "ACTIVE"}
              options={accountStatuses.map((s) => ({ value: s, label: accountStatusLabels[s] }))}
            />
          </Field>
          <Field label="Payment terms (days)">
            <Input type="number" min="0" name="paymentTerms" defaultValue={customer?.paymentTerms ?? 30} />
          </Field>
          <Field label="Email">
            <Input type="email" name="email" defaultValue={customer?.email ?? ""} />
          </Field>
          <Field label="Phone">
            <Input name="phone" defaultValue={customer?.phone ?? ""} />
          </Field>
          <Field label="Address line 1">
            <Input name="addressLine1" defaultValue={customer?.addressLine1 ?? ""} />
          </Field>
          <Field label="Address line 2">
            <Input name="addressLine2" defaultValue={customer?.addressLine2 ?? ""} />
          </Field>
          <Field label="City / town">
            <Input name="city" defaultValue={customer?.city ?? ""} />
          </Field>
          <Field label="Postcode">
            <Input name="postcode" defaultValue={customer?.postcode ?? ""} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes">
            <Textarea name="notes" rows={2} defaultValue={customer?.notes ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Account settings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Account type">
            <Select
              name="accountType"
              defaultValue={customer?.accountType ?? "CREDIT"}
              options={accountTypes.map((t) => ({ value: t, label: accountTypeLabels[t] }))}
            />
          </Field>
          <Field label="Invoice schedule">
            <Select
              name="invoiceSchedule"
              defaultValue={customer?.invoiceSchedule ?? "ON_COMPLETION"}
              options={invoiceSchedules.map((s) => ({ value: s, label: invoiceScheduleLabels[s] }))}
            />
          </Field>
          <Field label="SLA group" hint="e.g. Premium, Standard">
            <Input name="slaGroup" defaultValue={customer?.slaGroup ?? ""} />
          </Field>
          <Field label="Category" hint="e.g. Retail, Pharma">
            <Input name="category" defaultValue={customer?.category ?? ""} />
          </Field>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit">{customer ? "Save changes" : "Create customer"}</Button>
      </div>
    </form>
  );
}
