"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNumber } from "@/lib/reference";
import { logJobEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { InvoiceStatus, JobEventType, JobStatus } from "@prisma/client";

/**
 * Generate a draft invoice from a customer's completed, not-yet-invoiced jobs.
 * One invoice line per job. Jobs are moved to INVOICED and linked to the invoice.
 */
export async function generateInvoice(customerId: string) {
  const user = await getCurrentUser();
  const actor = user?.name ?? "system";

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const jobs = await prisma.job.findMany({
    where: { customerId, status: JobStatus.COMPLETED, invoiceId: null },
    orderBy: { serviceDate: "asc" },
  });

  if (jobs.length === 0) {
    redirect("/invoices?error=nojobs");
  }

  const subtotal = jobs.reduce((sum, j) => sum + j.customerCharge, 0);
  const total = Math.round(subtotal * 100) / 100;
  const number = await nextInvoiceNumber();
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + (customer.paymentTerms ?? 30));

  const invoice = await prisma.invoice.create({
    data: {
      number,
      customerId,
      status: InvoiceStatus.DRAFT,
      issueDate,
      dueDate,
      subtotal: total,
      total,
      lines: {
        create: jobs.map((j) => ({
          jobId: j.id,
          description: `${j.reference} — ${j.serviceDate.toLocaleDateString("en-GB")}${
            j.customerRef ? ` (${j.customerRef})` : ""
          }`,
          amount: j.customerCharge,
        })),
      },
    },
  });

  // Link jobs and mark invoiced.
  await prisma.job.updateMany({
    where: { id: { in: jobs.map((j) => j.id) } },
    data: { invoiceId: invoice.id, status: JobStatus.INVOICED },
  });
  for (const j of jobs) {
    await logJobEvent(j.id, JobEventType.INVOICED, `Added to invoice ${number}`, actor);
  }

  revalidatePath("/invoices");
  revalidatePath("/");
  redirect(`/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function voidInvoice(id: string) {
  // Voiding releases the jobs back to COMPLETED so they can be re-invoiced.
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id },
    include: { jobs: true },
  });
  await prisma.job.updateMany({
    where: { id: { in: invoice.jobs.map((j) => j.id) } },
    data: { status: JobStatus.COMPLETED, invoiceId: null },
  });
  await prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.VOID },
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/");
}
