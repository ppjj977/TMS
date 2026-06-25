import { logout } from "@/actions/auth";
import { SessionUser } from "@/lib/auth";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Operator",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="md:hidden text-lg font-semibold text-brand-700">TMS</div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">{roleLabels[user.role] ?? user.role}</div>
        </div>
        <form action={logout}>
          <button className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
