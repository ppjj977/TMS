"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCompanySetting } from "@/lib/company";

const schema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  vatRate: z.coerce.number().min(0).default(20),
  companyReg: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  sortCode: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
});

export async function updateCompanySettings(formData: FormData) {
  const data = schema.parse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    postcode: formData.get("postcode") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
    vatRate: formData.get("vatRate") || 20,
    companyReg: formData.get("companyReg") || undefined,
    bankName: formData.get("bankName") || undefined,
    sortCode: formData.get("sortCode") || undefined,
    accountNumber: formData.get("accountNumber") || undefined,
  });

  const current = await getCompanySetting();
  await prisma.companySetting.update({ where: { id: current.id }, data });
  revalidatePath("/settings");
  revalidatePath("/invoices");
}
