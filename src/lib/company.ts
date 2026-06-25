import { prisma } from "./prisma";
import { CompanySetting } from "@prisma/client";

// The company settings are a singleton row. Fetch it, creating a default if it
// doesn't exist yet.
export async function getCompanySetting(): Promise<CompanySetting> {
  const existing = await prisma.companySetting.findFirst();
  if (existing) return existing;
  return prisma.companySetting.create({ data: {} });
}
