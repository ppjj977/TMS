import Link from "next/link";
import { ReactNode } from "react";
import {
  JobStatus,
  StopStatus,
  AccountStatus,
  DriverStatus,
  VehicleStatus,
} from "@prisma/client";
import {
  jobStatusLabels,
  stopStatusLabels,
  accountStatusLabels,
  driverStatusLabels,
  vehicleStatusLabels,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const tone: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  blue: "bg-blue-100 text-blue-700 ring-blue-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  green: "bg-green-100 text-green-700 ring-green-200",
  red: "bg-red-100 text-red-700 ring-red-200",
  purple: "bg-purple-100 text-purple-700 ring-purple-200",
};

export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: keyof typeof tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone[color]}`}
    >
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
  return <Badge color={jobStatusColor[status]}>{jobStatusLabels[status]}</Badge>;
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
  return <Badge color={accountStatusColor[status]}>{accountStatusLabels[status]}</Badge>;
}

const driverStatusColor: Record<DriverStatus, keyof typeof tone> = {
  ACTIVE: "green",
  INACTIVE: "gray",
  ON_LEAVE: "amber",
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return <Badge color={driverStatusColor[status]}>{driverStatusLabels[status]}</Badge>;
}

const vehicleStatusColor: Record<VehicleStatus, keyof typeof tone> = {
  ACTIVE: "green",
  MAINTENANCE: "amber",
  OFF_ROAD: "red",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge color={vehicleStatusColor[status]}>{vehicleStatusLabels[status]}</Badge>;
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
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
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
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
    >
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
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium ${styles}`}
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
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50";
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Form primitives (server-component friendly, plain HTML)
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
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-md border-gray-300 border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500";

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
