"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/bookings", label: "Bookings" },
  { href: "/allocation", label: "Allocation" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/drivers", label: "Drivers" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/rate-cards", label: "Rate cards" },
];

export function Nav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          T
        </span>
        <span className="text-lg font-semibold text-gray-900">TMS</span>
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            isActive(l.href)
              ? "bg-brand-50 text-brand-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
