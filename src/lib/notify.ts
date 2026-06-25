import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { money } from "./format";

// High-level notifications, composed from job data. Each fails soft — a missing
// email address simply means no message is sent.

function customerRecipient(job: {
  contact: { email: string | null } | null;
  customer: { email: string | null };
}): string {
  return job.contact?.email || job.customer.email || "";
}

function stopSummary(stops: { type: string; postcode: string; city: string | null }[]): string {
  return stops
    .map((s, i) => `  ${i + 1}. ${s.type === "COLLECTION" ? "Collect" : "Deliver"} — ${s.city ?? ""} ${s.postcode}`.trimEnd())
    .join("\n");
}

export async function notifyBookingConfirmation(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { customer: true, contact: true, stops: { orderBy: { sequence: "asc" } } },
  });
  if (!job) return;
  const to = customerRecipient(job);
  await sendEmail({
    to,
    jobId,
    subject: `Booking confirmed — ${job.reference}`,
    body:
      `Hi ${job.contact?.name ?? job.customer.name},\n\n` +
      `Your booking ${job.reference} has been received.\n\n` +
      `Service date: ${job.serviceDate.toLocaleString("en-GB")}\n` +
      `Charge: ${money(job.customerCharge)}\n\n` +
      `Stops:\n${stopSummary(job.stops)}\n\n` +
      `Thank you.`,
  });
}

export async function notifyAllocation(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { driver: true, stops: { orderBy: { sequence: "asc" } } },
  });
  if (!job || !job.driver?.email) return;
  await sendEmail({
    to: job.driver.email,
    jobId,
    subject: `New job allocated — ${job.reference}`,
    body:
      `Hi ${job.driver.name},\n\n` +
      `You've been allocated job ${job.reference}.\n` +
      `Service date: ${job.serviceDate.toLocaleString("en-GB")}\n\n` +
      `Stops:\n${stopSummary(job.stops)}\n\n` +
      `Open the driver app for full details.`,
  });
}

export async function notifyCompletion(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { customer: true, contact: true },
  });
  if (!job) return;
  const to = customerRecipient(job);
  await sendEmail({
    to,
    jobId,
    subject: `Delivery completed — ${job.reference}`,
    body:
      `Hi ${job.contact?.name ?? job.customer.name},\n\n` +
      `All stops on job ${job.reference} are now complete.\n\n` +
      `Thank you for using our service.`,
  });
}
