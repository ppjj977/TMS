"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSession,
  homePathFor,
  setSession,
  verifyPassword,
} from "@/lib/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await setSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    driverId: user.driverId,
    customerId: user.customerId,
  });

  redirect(next || homePathFor(user.role));
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
