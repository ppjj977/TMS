import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Only drivers (with a linked driver record) use this area.
  if (user.role !== Role.DRIVER || !user.driverId) {
    redirect(homePathFor(user.role));
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-brand-600 px-4 py-3 text-white">
        <Link href="/driver" className="text-lg font-semibold">
          TMS Driver
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm">{user.name}</span>
          <form action={logout}>
            <button className="rounded-md bg-white/15 px-2 py-1 text-xs font-medium hover:bg-white/25">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
