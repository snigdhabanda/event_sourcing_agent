import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Server-side Neon Auth instance (Better Auth under the hood).
 *
 * Exposes Better Auth server methods plus:
 *   - auth.handler()      → mounted at /api/auth/[...path]
 *   - auth.getSession()   → read the current session in RSCs / route handlers
 *
 * Logged-in users are mirrored into Postgres at neon_auth."user".
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** Convenience: the current user (or null), used across server components. */
export async function getCurrentUser() {
  const { data } = await auth.getSession();
  return data?.user ?? null;
}
