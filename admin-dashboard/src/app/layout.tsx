import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ClientProviders from "@/components/ClientProviders";

export const metadata: Metadata = {
  title: "NestOps — Administration Dashboard",
  description:
    "Cross-society monsoon drainage coordination. Track incoming reports, shared cases, federation handoffs, and repair work orders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
