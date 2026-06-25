import Link from "next/link";
import { ReactNode } from "react";
import {
  JobStatus,
  StopStatus,
  AccountStatus,
  DriverStatus,
  VehicleStatus,
  InvoiceStatus,
} from "@prisma/client";
import {
  jobStatusLabels,
  stopStatusLabels,
  accountStatusLabels,
  driverStatusLabels,
  vehicleStatusLabels,
  invoiceStatusLabels,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const tone: Record<string, string> = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

const dot: Record<string, string> = {
  gray: "bg-slate-400",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  purple: "bg-violet-500",
};

export function Badge({
  children,
  color = "gray",
  withDot = false,
}: {
  children: ReactNode;
  color?: keyof typeof tone;
  withDot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone[color]}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${dot[color]}`} />}
      {children}
    </span>
  );
}

const jobStatusColor: Record<JobStatus, keyof typeof tone> = {
  BOOKED: "gray",
  ALLOCATED: "blue",
  ON_ROUTE: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
  INVOICED: "purple",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge color={jobStatusColor[status]} withDot>{jobStatusLabels[status]}</Badge>;
}

const stopStatusColor: Record<StopStatus, keyof typeof tone> = {
  PENDING: "gray",
  ARRIVED: "amber",
  COMPLETED: "green",
  FAILED: "red",
};

export function StopStatusBadge({ status }: { status: StopStatus }) {
  return <Badge color={stopStatusColor[status]}>{stopStatusLabels[status]}</Badge>;
}

const accountStatusColor: Record<AccountStatus, keyof typeof tone> = {
  ACTIVE: "green",
  ON_HOLD: "amber",
  CLOSED: "red",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge color={accountStatusColor[status]} withDot>{accountStatusLabels[status]}</Badge>;
}

const driverStatusColor: Record<DriverStatus, keyof typeof tone> = {
  ACTIVE: "green",
  INACTIVE: "gray",
  ON_LEAVE: "amber",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return <Badge color={driverStatusColor[status]} withDot>{driverStatusLabels[status]}</Badge>;
}

const vehicleStatusColor: Record<VehicleStatus, keyof typeof tone> = {
  ACTIVE: "green",
  MAINTENANCE: "amber",
  OFF_ROAD: "red",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge color={vehicleStatusColor[status]} withDot>{vehicleStatusLabels[status]}</Badge>;
}

const invoiceStatusColor: Record<InvoiceStatus, keyof typeof tone> = {
  DRAFT: "gray",
  SENT: "blue",
  PAID: "green",
  VOID: "red",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge color={invoiceStatusColor[status]} withDot>{invoiceStatusLabels[status]}</Badge>;
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
      : "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "submit",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
      : variant === "danger"
        ? "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        : "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:shadow-focus disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 text-slate-500">{icon}</div>}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "amber" | "green" | "slate";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accents[accent]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tnum">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

// Table helpers for consistent, premium tables across pages.
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/60">
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:shadow-focus";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function Select({
  options,
  ...props
}: {
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
