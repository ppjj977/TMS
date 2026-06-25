import Link from "next/link";
import { logout } from "@/actions/auth";
import { SessionUser } from "@/lib/auth";
import { Icon } from "./icons";
import { LogoMark } from "./logo";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Operator",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="md:hidden"><LogoMark size={30} className="rounded-lg" /></div>

      <Link
        href="/bookings/new"
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        <Icon name="plus" size={16} />
        <span className="hidden sm:inline">New booking</span>
      </Link>

      <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-slate-900">{user.name}</div>
          <div className="text-xs text-slate-500">{roleLabels[user.role] ?? user.role}</div>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white">
          {initials(user.name)}
        </span>
        <form action={logout}>
          <button
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="logout" size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}
