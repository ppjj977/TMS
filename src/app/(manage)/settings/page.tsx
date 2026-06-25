import Link from "next/link";
import { getCompanySetting } from "@/lib/company";
import { updateCompanySettings } from "@/actions/company";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const company = await getCompanySetting();

  return (
    <div>
      <PageHeader
        title="Company settings"
        subtitle="Your billing identity — shown on every invoice"
      />
      <form action={updateCompanySettings} className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required>
              <Input name="name" defaultValue={company.name} required />
            </Field>
            <Field label="Company reg. number">
              <Input name="companyReg" defaultValue={company.companyReg ?? ""} />
            </Field>
            <Field label="Address line 1">
              <Input name="addressLine1" defaultValue={company.addressLine1 ?? ""} />
            </Field>
            <Field label="Address line 2">
              <Input name="addressLine2" defaultValue={company.addressLine2 ?? ""} />
            </Field>
            <Field label="City / town">
              <Input name="city" defaultValue={company.city ?? ""} />
            </Field>
            <Field label="Postcode">
              <Input name="postcode" defaultValue={company.postcode ?? ""} />
            </Field>
            <Field label="Email">
              <Input type="email" name="email" defaultValue={company.email ?? ""} />
            </Field>
            <Field label="Phone">
              <Input name="phone" defaultValue={company.phone ?? ""} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Tax &amp; bank</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="VAT number">
              <Input name="vatNumber" defaultValue={company.vatNumber ?? ""} />
            </Field>
            <Field label="VAT rate (%)" hint="Applied to invoices">
              <Input type="number" step="0.1" min="0" name="vatRate" defaultValue={company.vatRate} />
            </Field>
            <div />
            <Field label="Bank name">
              <Input name="bankName" defaultValue={company.bankName ?? ""} />
            </Field>
            <Field label="Sort code">
              <Input name="sortCode" defaultValue={company.sortCode ?? ""} />
            </Field>
            <Field label="Account number">
              <Input name="accountNumber" defaultValue={company.accountNumber ?? ""} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Save settings</Button>
        </div>
      </form>

      <Card className="mt-6 flex items-center justify-between p-5">
        <div>
          <div className="font-medium text-slate-900">Routing speeds</div>
          <div className="text-sm text-slate-500">
            Per-vehicle speeds &amp; dwell used for ETAs and deadline checks.
          </div>
        </div>
        <Link
          href="/settings/routing"
          className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Configure →
        </Link>
      </Card>

      <Card className="mt-4 flex items-center justify-between p-5">
        <div>
          <div className="font-medium text-slate-900">Auto supplements</div>
          <div className="text-sm text-slate-500">
            Out-of-hours and postcode-zone (ULEZ / congestion) charges added automatically.
          </div>
        </div>
        <Link
          href="/settings/supplements"
          className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          Configure →
        </Link>
      </Card>
    </div>
  );
}
