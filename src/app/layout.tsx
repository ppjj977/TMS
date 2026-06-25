import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "TMS — Transport Management System",
  description: "Same-day multi-drop transport operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
            <Nav />
          </aside>
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
