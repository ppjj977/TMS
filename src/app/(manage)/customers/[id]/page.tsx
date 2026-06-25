import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createContact,
  deleteContact,
  createSavedAddress,
  deleteSavedAddress,
} from "@/actions/customers";
import {
  AccountStatusBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  JobStatusBadge,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import {
  accountTypeLabels,
  formatDate,
  invoiceScheduleLabels,
  money,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      savedAddresses: { orderBy: { label: "asc" } },
      jobs: { orderBy: { serviceDate: "desc" }, take: 15 },
      rateCards: { where: { active: true } },
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.accountCode} · ${customer.paymentTerms} day terms`}
        action={
          <div className="flex items-center gap-2">
            <AccountStatusBadge status={customer.status} />
            <LinkButton href={`/customers/${customer.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contacts</h2>
              <Badge color="blue">{customer.rateCards.length} active rate cards</Badge>
            </div>
            {customer.contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {customer.contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div className="text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.isPrimary && <Badge color="green">Primary</Badge>}
                      <div className="text-gray-500">
                        {c.role && `${c.role} · `}
                        {c.email} {c.phone && `· ${c.phone}`}
                      </div>
                    </div>
                    <form action={deleteContact.bind(null, c.id, customer.id)}>
                      <button className="text-xs font-medium text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={createContact.bind(null, customer.id)}
              className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2"
            >
              <Field label="Name" required>
                <Input name="name" required />
              </Field>
              <Field label="Role">
                <Input name="role" placeholder="e.g. Transport manager" />
              </Field>
              <Field label="Email">
                <Input type="email" name="email" />
              </Field>
              <Field label="Phone">
                <Input name="phone" />
              </Field>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="isPrimary" className="rounded border-gray-300" />
                Primary contact
              </label>
              <div className="flex items-end justify-end">
                <Button type="submit" variant="secondary">+ Add contact</Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Address book</h2>
            {customer.savedAddresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {customer.savedAddresses.map((a) => (
                  <li key={a.id} className="flex items-start justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium">{a.label}</span>
                      <div className="text-gray-500">
                        {a.name && `${a.name} · `}
                        {a.addressLine1}
                        {a.city ? `, ${a.city}` : ""} · {a.postcode}
                      </div>
                    </div>
                    <form action={deleteSavedAddress.bind(null, a.id, customer.id)}>
                      <button className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={createSavedAddress.bind(null, customer.id)}
              className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2"
            >
              <Field label="Label" required>
                <Input name="label" placeholder="e.g. Manchester DC" required />
              </Field>
              <Field label="Site / company name">
                <Input name="name" />
              </Field>
              <Field label="Address line 1" required>
                <Input name="addressLine1" required />
              </Field>
              <Field label="Address line 2">
                <Input name="addressLine2" />
              </Field>
              <Field label="City / town">
                <Input name="city" />
              </Field>
              <Field label="Postcode" required>
                <Input name="postcode" required />
              </Field>
              <Field label="Contact name">
                <Input name="contactName" />
              </Field>
              <Field label="Contact phone">
                <Input name="contactPhone" />
              </Field>
              <div className="flex items-end justify-end sm:col-span-2">
                <Button type="submit" variant="secondary">+ Add address</Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Recent jobs</h2>
            {customer.jobs.length === 0 ? (
              <EmptyState message="No jobs booked for this customer yet." />
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Vehicle</th>
                    <th className="py-2">Charge</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <Link href={`/bookings/${job.id}`} className="text-brand-600 hover:underline">
                          {job.reference}
                        </Link>
                      </td>
                      <td className="py-2">{formatDate(job.serviceDate)}</td>
                      <td className="py-2">{vehicleTypeLabels[job.vehicleType]}</td>
                      <td className="py-2">{money(job.customerCharge)}</td>
                      <td className="py-2"><JobStatusBadge status={job.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Account</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Email" value={customer.email} />
              <Info label="Phone" value={customer.phone} />
              <Info
                label="Address"
                value={[customer.addressLine1, customer.addressLine2, customer.city, customer.postcode]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Info label="Account type" value={accountTypeLabels[customer.accountType]} />
              <Info label="Invoicing" value={invoiceScheduleLabels[customer.invoiceSchedule]} />
              <Info label="SLA group" value={customer.slaGroup} />
              <Info label="Category" value={customer.category} />
            </dl>
            {customer.notes && (
              <p className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-600">{customer.notes}</p>
            )}
          </Card>

          <LinkButton href={`/rate-cards/new?kind=CUSTOMER&customerId=${customer.id}`} variant="secondary">
            + Rate card for this customer
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{value || "—"}</dd>
    </div>
  );
}
