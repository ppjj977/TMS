import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
