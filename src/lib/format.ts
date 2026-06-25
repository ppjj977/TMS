import {
  AccountStatus,
  AccountType,
  DayType,
  DriverStatus,
  InvoiceSchedule,
  InvoiceStatus,
  JobStatus,
  RateCardKind,
  ServiceLevel,
  StopStatus,
  StopType,
  TimeBand,
  VehicleStatus,
  VehicleType,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Money / numbers / dates
// ---------------------------------------------------------------------------

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function money(value: number | null | undefined): string {
  return gbp.format(value ?? 0);
}

export function miles(value: number | null | undefined): string {
  return `${(value ?? 0).toLocaleString("en-GB", {
    maximumFractionDigits: 1,
  })} mi`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Input[type=date] / datetime-local helpers (avoid timezone surprises).
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function toDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// ---------------------------------------------------------------------------
// Enum labels
// ---------------------------------------------------------------------------

export const vehicleTypeLabels: Record<VehicleType, string> = {
  BIKE: "Bike",
  CAR: "Car",
  SMALL_VAN: "Small van",
  SWB_VAN: "SWB van",
  LWB_VAN: "LWB van",
  LUTON: "Luton",
  SEVEN_FIVE_TONNE: "7.5 tonne",
  EIGHTEEN_TONNE: "18 tonne",
  ARTIC: "Artic",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  BOOKED: "Booked",
  ALLOCATED: "Allocated",
  ON_ROUTE: "On route",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  INVOICED: "Invoiced",
};

export const stopTypeLabels: Record<StopType, string> = {
  COLLECTION: "Collection",
  DELIVERY: "Delivery",
};

export const stopStatusLabels: Record<StopStatus, string> = {
  PENDING: "Pending",
  ARRIVED: "Arrived",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  CLOSED: "Closed",
};

export const driverStatusLabels: Record<DriverStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  OFF_ROAD: "Off road",
};

export const dayTypeLabels: Record<DayType, string> = {
  ANY: "Any day",
  WEEKDAY: "Weekday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
  BANK_HOLIDAY: "Bank holiday",
};

export const timeBandLabels: Record<TimeBand, string> = {
  ANY: "Any time",
  DAYTIME: "Daytime",
  OUT_OF_HOURS: "Out of hours",
};

export const rateCardKindLabels: Record<RateCardKind, string> = {
  CUSTOMER: "Customer (revenue)",
  DRIVER: "Driver (cost)",
};

export const serviceLevelLabels: Record<ServiceLevel, string> = {
  SAMEDAY_DIRECT: "Same-day direct",
  SAMEDAY_STANDARD: "Same-day standard",
  TIMED: "Timed delivery",
  OVERNIGHT: "Overnight",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  VOID: "Void",
};

export const invoiceScheduleLabels: Record<InvoiceSchedule, string> = {
  ON_COMPLETION: "On completion",
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
};

export const accountTypeLabels: Record<AccountType, string> = {
  PREPAY: "Prepay",
  CREDIT: "Credit",
};

// Convenience arrays for building <select> options.
export const vehicleTypes = Object.keys(vehicleTypeLabels) as VehicleType[];
export const jobStatuses = Object.keys(jobStatusLabels) as JobStatus[];
export const stopTypes = Object.keys(stopTypeLabels) as StopType[];
export const accountStatuses = Object.keys(accountStatusLabels) as AccountStatus[];
export const driverStatuses = Object.keys(driverStatusLabels) as DriverStatus[];
export const vehicleStatuses = Object.keys(vehicleStatusLabels) as VehicleStatus[];
export const dayTypes = Object.keys(dayTypeLabels) as DayType[];
export const timeBands = Object.keys(timeBandLabels) as TimeBand[];
export const rateCardKinds = Object.keys(rateCardKindLabels) as RateCardKind[];
export const serviceLevels = Object.keys(serviceLevelLabels) as ServiceLevel[];
export const invoiceStatuses = Object.keys(invoiceStatusLabels) as InvoiceStatus[];
export const invoiceSchedules = Object.keys(invoiceScheduleLabels) as InvoiceSchedule[];
export const accountTypes = Object.keys(accountTypeLabels) as AccountType[];
