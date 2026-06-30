"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@neondatabase/auth-ui";

/** Header auth controls: avatar menu when signed in, Sign-in button otherwise. */
export function AuthControls() {
  return (
    <>
      <SignedIn>
        <UserButton size="icon" />
      </SignedIn>
      <SignedOut>
        <Link
          href="/auth/sign-in"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700"
        >
          Sign in
        </Link>
      </SignedOut>
    </>
  );
}
