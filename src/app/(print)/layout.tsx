import { redirect } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Minimal full-width shell (no sidebar) for printable documents.
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isManager(user.role)) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </div>
    </div>
  );
}
