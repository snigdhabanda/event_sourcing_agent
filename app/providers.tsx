"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

/**
 * Client-side auth UI context. Wraps the app so <UserButton>, <AuthView>,
 * <SignedIn>/<SignedOut> work, and wires Better Auth UI navigation to the
 * Next.js App Router. Google is the enabled social provider.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      social={{ providers: ["google"] }}
      redirectTo="/"
      navigate={(href) => router.push(href)}
      replace={(href) => router.replace(href)}
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
