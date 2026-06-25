import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuoteStatus } from "@prisma/client";
import { convertQuote, setQuoteStatus } from "@/actions/quotes";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import {
  formatDate,
  miles,
  money,
  quoteStatusLabels,
  serviceLevelLabels,
  vehicleTypeLabels,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const color: Record<string, "gray" | "blue" | "green" | "amber"> = {
  DRAFT: "gray",
  SENT: "blue",
  CONVERTED: "green",
  EXPIRED: "amber",
};

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const quote = await prisma.quote.findUnique({ where: { id }, include: { customer: true } });
  if (!quote) notFound();

  return (
    <div>
      <PageHeader
        title={quote.reference}
        subtitle={quote.customer?.name ?? quote.customerName ?? "Ad-hoc quote"}
        action={
          <div className="flex items-center gap-2">
            <Badge color={color[quote.status]} withDot>{quoteStatusLabels[quote.status]}</Badge>
            <Link href="/quotes" className="text-sm font-medium text-brand-600 hover:underline">← Quotes</Link>
          </div>
        }
      />

      {error === "nocustomer" && (
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          Attach a customer account to this quote before converting it to a booking.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Price</h2>
              <span className="text-3xl font-semibold tracking-tight text-slate-900 tnum">{money(quote.amount)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {quote.rateCardName ? `via ${quote.rateCardName}` : "no rate card matched"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Detail label="Vehicle">{vehicleTypeLabels[quote.vehicleType]}</Detail>
              <Detail label="Service">{serviceLevelLabels[quote.serviceLevel]}</Detail>
              <Detail label="Distance">{miles(quote.distanceMiles)}</Detail>
              <Detail label="Drops">{quote.drops}</Detail>
              <Detail label="Pieces">{quote.pieces}</Detail>
              <Detail label="Route">{quote.collectionPostcode ?? "?"} → {quote.deliveryPostcode ?? "?"}</Detail>
            </dl>
            {quote.notes && (
              <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{quote.notes}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Actions</h2>
            <div className="flex flex-col gap-2">
              {quote.status !== QuoteStatus.CONVERTED ? (
                <>
                  {quote.status === QuoteStatus.DRAFT && (
                    <form action={setQuoteStatus.bind(null, quote.id, QuoteStatus.SENT)}>
                      <Button type="submit" variant="secondary" className="w-full justify-center">Mark as sent</Button>
                    </form>
                  )}
                  <form action={convertQuote.bind(null, quote.id)}>
                    <Button type="submit" className="w-full justify-center">Convert to booking</Button>
                  </form>
                </>
              ) : (
                quote.convertedJobId && (
                  <Link href={`/bookings/${quote.convertedJobId}`} className="text-sm font-medium text-brand-600 hover:underline">
                    View the booking →
                  </Link>
                )
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">Created {formatDate(quote.createdAt)}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{children}</dd>
    </div>
  );
}
