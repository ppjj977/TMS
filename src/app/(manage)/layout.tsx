import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Topbar } from "@/components/topbar";
import { getCurrentUser, homePathFor, isManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Drivers and customers don't belong here — send them to their own area.
  if (!isManager(user.role)) redirect(homePathFor(user.role));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
        <Nav />
      </aside>
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Topbar user={user} />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
