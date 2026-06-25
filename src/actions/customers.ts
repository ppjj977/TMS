"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccountStatus } from "@prisma/client";

const customerSchema = z.object({
  accountCode: z.string().trim().min(1, "Account code is required"),
  name: z.string().trim().min(1, "Name is required"),
  status: z.nativeEnum(AccountStatus),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().optional(),
  paymentTerms: z.coerce.number().int().min(0).default(30),
  notes: z.string().trim().optional(),
});

function parse(formData: FormData) {
  return customerSchema.parse({
    accountCode: formData.get("accountCode"),
    name: formData.get("name"),
    status: formData.get("status"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    addressLine1: formData.get("addressLine1") || undefined,
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    postcode: formData.get("postcode") || undefined,
    paymentTerms: formData.get("paymentTerms") || 30,
    notes: formData.get("notes") || undefined,
  });
}

export async function createCustomer(formData: FormData) {
  const data = parse(formData);
  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const data = parse(formData);
  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  role: z.string().trim().optional(),
  isPrimary: z.coerce.boolean().default(false),
});

export async function createContact(customerId: string, formData: FormData) {
  const data = contactSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    role: formData.get("role") || undefined,
    isPrimary: formData.get("isPrimary") === "on",
  });
  await prisma.contact.create({ data: { ...data, customerId } });
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteContact(id: string, customerId: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
}
