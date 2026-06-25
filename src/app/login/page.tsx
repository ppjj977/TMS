import { login } from "@/actions/auth";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 10%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(500px circle at 80% 80%, rgba(67,56,202,0.30), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold shadow-lg">
            T
          </span>
          <span className="text-xl font-semibold tracking-tight">TMS</span>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            The control room for
            <br />
            same-day &amp; multi-drop.
          </h2>
          <p className="mt-4 max-w-md text-slate-300">
            Book, price and allocate jobs, track every drop in real time, capture
            proof of delivery, and invoice — all in one place.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-slate-300">
            {[
              "Live allocation & status tracking",
              "Customer & driver rate cards with margin",
              "Driver app + customer self-serve portal",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} TMS · Transport Management System
        </div>
      </div>

      {/* Form */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
              T
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">TMS</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your operations console.</p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              Invalid email or password.
            </div>
          )}

          <form action={login} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                required
                autoFocus
                placeholder="you@company.com"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:shadow-focus"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:shadow-focus"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
            Demo: <span className="font-medium text-slate-700">admin@tms.example</span> ·
            password <span className="font-medium text-slate-700">password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
