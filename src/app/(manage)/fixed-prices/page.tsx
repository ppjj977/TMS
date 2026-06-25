import { prisma } from "@/lib/prisma";
import { createFixedPrice, deleteFixedPrice } from "@/actions/supplements";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Table, TBody, THead, Th } from "@/components/ui";
import { money, vehicleTypeLabels, vehicleTypes } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FixedPricesPage() {
  const [prices, customers] = await Promise.all([
    prisma.fixedPrice.findMany({ include: { customer: true }, orderBy: [{ fromOutcode: "asc" }, { toOutcode: "asc" }] }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Fixed prices"
        subtitle="Set a flat price for a postcode-area → postcode-area journey (overrides mileage pricing)"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {prices.length === 0 ? (
            <EmptyState message="No fixed prices yet." />
          ) : (
            <Card>
              <Table>
                <THead>
                  <Th>From</Th><Th>To</Th><Th>Customer</Th><Th>Vehicle</Th><Th right>Price</Th><Th></Th>
                </THead>
                <TBody>
                  {prices.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-700">{p.fromOutcode}</td>
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-700">{p.toOutcode}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.customer?.name ?? <span className="text-slate-400">All</span>}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.vehicleType ? vehicleTypeLabels[p.vehicleType] : <span className="text-slate-400">Any</span>}</td>
                      <td className="px-4 py-2.5 text-right tnum font-medium text-slate-900">{money(p.price)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={deleteFixedPrice.bind(null, p.id)}>
                          <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </div>

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">New fixed price</h2>
            <form action={createFixedPrice} className="space-y-3">
              <Field label="Customer" hint="Blank = all customers">
                <Select name="customerId" options={[{ value: "", label: "All customers" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
              </Field>
              <Field label="Vehicle type" hint="Blank = any">
                <Select name="vehicleType" options={[{ value: "", label: "Any vehicle" }, ...vehicleTypes.map((v) => ({ value: v, label: vehicleTypeLabels[v] }))]} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From (outcode)" required>
                  <Input name="fromOutcode" placeholder="M17" required />
                </Field>
                <Field label="To (outcode)" required>
                  <Input name="toOutcode" placeholder="LS12" required />
                </Field>
              </div>
              <Field label="Price (£)" required>
                <Input type="number" step="0.01" min="0" name="price" required />
              </Field>
              <div className="flex justify-end">
                <Button type="submit">Add fixed price</Button>
              </div>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              Outcode = the first part of a postcode (e.g. <span className="font-mono">M17</span> 1AB →{" "}
              <span className="font-mono">M17</span>). Matched on the first collection → last delivery.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
