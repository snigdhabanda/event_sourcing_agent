import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@neondatabase/auth-ui/css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SF Events",
  description: "Discover SF events and see who's going.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
