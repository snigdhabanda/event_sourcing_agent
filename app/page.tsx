import { listUpcomingEvents } from "@/db/queries";
import { EventBrowser } from "./components/EventBrowser";

// Always reflect the latest DB state (events change after each crawl).
export const dynamic = "force-dynamic";

export default async function Home() {
  const initialEvents = await listUpcomingEvents();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">SF Events</h1>
        <p className="mt-1 text-neutral-500">
          Search upcoming events across the San Francisco tech scene.
        </p>
      </header>

      <EventBrowser initialEvents={initialEvents} />
    </main>
  );
}
