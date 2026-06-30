import { AuthView } from "@neondatabase/auth-ui";

/**
 * Catch-all auth screen: /auth/sign-in, /auth/sign-out, /auth/callback, etc.
 * AuthView renders the right form based on the pathname segment.
 */
export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string }>;
}) {
  const { pathname } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 via-white to-sky-50 px-4">
      <div className="w-full max-w-md">
        <AuthView pathname={pathname} />
      </div>
    </main>
  );
}
