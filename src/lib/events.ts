import { JobEventType } from "@prisma/client";
import { prisma } from "./prisma";

/** Append an entry to a job's audit trail. */
export async function logJobEvent(
  jobId: string,
  type: JobEventType,
  message: string,
  actor = "system",
): Promise<void> {
  try {
    await prisma.jobEvent.create({ data: { jobId, type, message, actor } });
  } catch {
    // Audit logging must never break the primary operation.
  }
}
