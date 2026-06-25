"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "./icons";

type Item = { href: string; label: string; icon: IconName };
type Section = { title: string; items: Item[] };

const sections: Section[] = [
  {
    title: "Operations",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard" },
      { href: "/bookings", label: "Bookings", icon: "bookings" },
      { href: "/allocation", label: "Allocation", icon: "allocation" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/customers", label: "Customers", icon: "customers" },
      { href: "/drivers", label: "Drivers", icon: "drivers" },
      { href: "/vehicles", label: "Vehicles", icon: "vehicles" },
      { href: "/rate-cards", label: "Rate cards", icon: "rates" },
    ],
  },
  {
    title: "Finance",
    items: [{ href: "/invoices", label: "Invoices", icon: "invoices" }],
  },
];

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex h-full flex-col gap-6 px-3 py-5">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-lg shadow-brand-900/40">
          T
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-white">TMS</span>
          <span className="text-[11px] text-slate-400">Transport Manager</span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <Icon
                      name={item.icon}
                      size={18}
                      className={active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-[11px] text-slate-400">
        <span className="font-medium text-slate-300">Same-day &amp; multi-drop</span>
        <br />
        Live ops, pricing &amp; invoicing.
      </div>
    </nav>
  );
}
