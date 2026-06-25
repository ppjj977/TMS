// Brand mark for the TMS product: a rounded-square app icon containing a
// stylised collection→delivery route (two nodes joined by a path with an
// arrowhead). Designed to read as "movement between points".

export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = "tms-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${id})`} />
      {/* route path */}
      <path
        d="M12 27.5C12 21 16 22 20 20c4-2 4.5-3 8-9.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      />
      {/* origin node */}
      <circle cx="12" cy="27.5" r="3.1" fill="white" />
      <circle cx="12" cy="27.5" r="1.3" fill="#4338ca" />
      {/* destination arrowhead */}
      <path
        d="M24.5 11.5l5.5-1-1 5.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  size = 36,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} className="shadow-lg shadow-brand-900/30 rounded-[11px]" />
      <span className="flex flex-col leading-none">
        <span className={`text-[15px] font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
          Trakr
        </span>
        <span className={`text-[11px] ${light ? "text-slate-400" : "text-slate-500"}`}>
          Transport Manager
        </span>
      </span>
    </span>
  );
}
