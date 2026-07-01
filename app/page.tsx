import { listUpcomingEvents, attachRsvps } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth/server";
import { EventBrowser, type CurrentUser } from "./components/EventBrowser";
import { AuthControls } from "./components/AuthControls";

// Always reflect the latest DB state (events + RSVPs change frequently).
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const base = await listUpcomingEvents();
  const initialEvents = await attachRsvps(base, user?.id ?? null);

  const currentUser: CurrentUser | null = user
    ? { id: user.id, name: user.name ?? null, email: user.email, image: user.image ?? null }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-white to-sky-50/60">
      <header className="border-b border-neutral-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌉</span>
            <span className="text-lg font-semibold tracking-tight">SF Events</span>
          </div>
          <AuthControls />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
  <div className="mb-8">
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
      What&apos;s happening in San Francisco
    </h1>
    <p className="mt-2 text-neutral-500">
      {currentUser
        ? "Search events, mark the ones you're going to, and see who else is in."
        : "Search upcoming events across the SF tech scene. Sign in to RSVP and see who's going."}
    </p>
  </div>

  {/* This adds space between heading and search bar */}
  <div className="mb-10 pt-4">
    <EventBrowser initialEvents={initialEvents} currentUser={currentUser} />
  </div>
</main>
    </div>
  );
}
