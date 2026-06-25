"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lookupPostcode } from "@/lib/postcode";
import { AccountStatus, AccountType, InvoiceSchedule } from "@prisma/client";

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
  accountType: z.nativeEnum(AccountType).default(AccountType.CREDIT),
  invoiceSchedule: z.nativeEnum(InvoiceSchedule).default(InvoiceSchedule.ON_COMPLETION),
  slaGroup: z.string().trim().optional(),
  category: z.string().trim().optional(),
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
    accountType: formData.get("accountType") || undefined,
    invoiceSchedule: formData.get("invoiceSchedule") || undefined,
    slaGroup: formData.get("slaGroup") || undefined,
    category: formData.get("category") || undefined,
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

// --- Saved address book -----------------------------------------------------

const savedAddressSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  name: z.string().trim().optional(),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  postcode: z.string().trim().min(1, "Postcode is required"),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
});

export async function createSavedAddress(customerId: string, formData: FormData) {
  const data = savedAddressSchema.parse({
    label: formData.get("label"),
    name: formData.get("name") || undefined,
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city") || undefined,
    postcode: formData.get("postcode"),
    contactName: formData.get("contactName") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });

  // Geocode the postcode so it can feed distance estimation later.
  const geo = await lookupPostcode(data.postcode);

  await prisma.savedAddress.create({
    data: {
      ...data,
      customerId,
      postcode: data.postcode.toUpperCase(),
      city: data.city || geo?.town || null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
    },
  });
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteSavedAddress(id: string, customerId: string) {
  await prisma.savedAddress.delete({ where: { id } });
  revalidatePath(`/customers/${customerId}`);
}
