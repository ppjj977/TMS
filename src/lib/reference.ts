import { prisma } from "./prisma";

/**
 * Generate the next human-friendly job reference, e.g. JOB-2026-0042.
 * Counts existing jobs created in the current calendar year and increments.
 */
export async function nextJobReference(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const count = await prisma.job.count({
    where: { createdAt: { gte: start, lt: end } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `JOB-${year}-${seq}`;
}

/** Generate the next invoice number, e.g. INV-2026-0042. */
export async function nextInvoiceNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const count = await prisma.invoice.count({
    where: { createdAt: { gte: start, lt: end } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `INV-${year}-${seq}`;
}

