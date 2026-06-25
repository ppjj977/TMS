import { SupplementType } from "@prisma/client";
import { prisma } from "./prisma";
import { outcode } from "./pricing";

export interface AutoSupplement {
  label: string;
  amount: number;
}

/**
 * Evaluate active auto-supplement rules against a job:
 *  - OUT_OF_HOURS: the service start is before oohStartHour or at/after
 *    oohEndHour (or any time at the weekend when appliesWeekend).
 *  - POSTCODE: any stop's outward code is in the rule's list (e.g. ULEZ /
 *    congestion zones).
 */
export async function evaluateAutoSupplements(args: {
  serviceDate: Date;
  postcodes: string[];
}): Promise<AutoSupplement[]> {
  const rules = await prisma.autoSupplementRule.findMany({ where: { active: true } });
  const hour = args.serviceDate.getHours();
  const day = args.serviceDate.getDay();
  const isWeekend = day === 0 || day === 6;
  const outs = new Set(args.postcodes.map((p) => outcode(p)).filter(Boolean));

  const out: AutoSupplement[] = [];
  for (const r of rules) {
    if (r.type === SupplementType.OUT_OF_HOURS) {
      const beforeStart = r.oohStartHour != null && hour < r.oohStartHour;
      const afterEnd = r.oohEndHour != null && hour >= r.oohEndHour;
      const weekend = r.appliesWeekend && isWeekend;
      if (beforeStart || afterEnd || weekend) out.push({ label: r.name, amount: r.amount });
    } else if (r.type === SupplementType.POSTCODE) {
      const codes = (r.outcodes ?? "")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      if (codes.some((c) => outs.has(c))) out.push({ label: r.name, amount: r.amount });
    }
  }
  return out;
}

/** Recompute and persist a job's total charge = base + sum(supplements). */
export async function recomputeJobCharge(jobId: string): Promise<void> {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { supplements: true },
  });
  const supTotal = job.supplements.reduce((s, x) => s + x.amount, 0);
  const customerCharge = Math.round((job.baseCharge + supTotal) * 100) / 100;
  await prisma.job.update({ where: { id: jobId }, data: { customerCharge } });
}
