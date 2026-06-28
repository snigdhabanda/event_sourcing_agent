"use client";

import { useEffect, useRef, useState } from "react";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  location: string | null;
  url: string;
  source: string;
}

export function EventBrowser({ initialEvents }: { initialEvents: EventItem[] }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      const q = query.trim();
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setEvents(data.results ?? []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try: ai founder mixer, hackathon, design jam…"
        className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-neutral-900"
      />

      <div className="mt-2 h-5 text-sm text-neutral-400">
        {loading
          ? "Searching…"
          : `${events.length} event${events.length === 1 ? "" : "s"}`}
      </div>

      <ul className="mt-4 space-y-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ul>

      {events.length === 0 && !loading && (
        <p className="mt-10 text-center text-neutral-400">No events found.</p>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <a href={event.url} target="_blank" rel="noreferrer" className="block">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-medium leading-snug">{event.title}</h2>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {event.source}
          </span>
        </div>

        {event.startsAt && (
          <p className="mt-1 text-sm text-neutral-600">
            {formatDate(event.startsAt)}
          </p>
        )}
        {event.location && (
          <p className="text-sm text-neutral-500">{event.location}</p>
        )}
        {event.description && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
            {event.description}
          </p>
        )}
      </a>
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}
