import { JobEventType, JobStatus, StopStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logJobEvent } from "./events";
import { notifyCompletion } from "./notify";

/**
 * Recompute a job's status from its stops and persist any change.
 * Any stop activity moves BOOKED/ALLOCATED -> ON_ROUTE; once every stop is
 * completed or failed the job moves to COMPLETED (and the customer is notified).
 */
export async function advanceJobFromStops(
  jobId: string,
  actor = "system",
): Promise<JobStatus> {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { stops: true },
  });

  const allDone = job.stops.every(
    (s) => s.status === StopStatus.COMPLETED || s.status === StopStatus.FAILED,
  );
  const anyActive = job.stops.some(
    (s) => s.status === StopStatus.ARRIVED || s.status === StopStatus.COMPLETED,
  );

  let newStatus = job.status;
  if (allDone && job.status !== JobStatus.INVOICED && job.status !== JobStatus.CANCELLED) {
    newStatus = JobStatus.COMPLETED;
  } else if (
    anyActive &&
    (job.status === JobStatus.ALLOCATED || job.status === JobStatus.BOOKED)
  ) {
    newStatus = JobStatus.ON_ROUTE;
  }

  if (newStatus !== job.status) {
    await prisma.job.update({ where: { id: jobId }, data: { status: newStatus } });
    await logJobEvent(jobId, JobEventType.STATUS_CHANGE, `Status ${job.status} → ${newStatus}`, actor);
    if (newStatus === JobStatus.COMPLETED) await notifyCompletion(jobId);
  }

  return newStatus;
}
