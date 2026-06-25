import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== Role.CUSTOMER || !user.customerId) {
    redirect(homePathFor(user.role));
  }

  const customer = await prisma.customer.findUnique({
    where: { id: user.customerId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/portal" className="text-lg font-semibold text-brand-700">
              {customer?.name ?? "Customer portal"}
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-gray-600">
              <Link href="/portal" className="hover:text-gray-900">My bookings</Link>
              <Link href="/portal/new" className="hover:text-gray-900">New booking</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
