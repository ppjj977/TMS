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

  // Already logged in? Send them home.
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-lg font-bold text-white">
            T
          </span>
          <span className="text-2xl font-semibold text-gray-900">TMS</span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-gray-900">Sign in</h1>
          <p className="mb-4 text-sm text-gray-500">Transport Management System</p>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              Invalid email or password.
            </div>
          )}

          <form action={login} className="space-y-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                name="email"
                required
                autoFocus
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                name="password"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Sign in
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          Demo logins are listed in the project README.
        </p>
      </div>
    </div>
  );
}
