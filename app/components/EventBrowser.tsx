"use client";

import { useEffect, useRef, useState } from "react";

export interface Attendee {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  location: string | null;
  url: string;
  source: string;
  attendees: Attendee[];
  goingCount: number;
  isGoing: boolean;
}

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function EventBrowser({
  initialEvents,
  currentUser,
}: {
  initialEvents: EventItem[];
  currentUser: CurrentUser | null;
}) {
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedIn = !!currentUser;

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      const params = new URLSearchParams();
      const q = query.trim();
      if (q) params.set("q", q);
      if (mineOnly) params.set("mine", "1");

      setLoading(true);
      try {
        const res = await fetch(`/api/search?${params.toString()}`);
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
  }, [query, mineOnly]);

  async function toggleGoing(target: EventItem) {
    if (!signedIn || !currentUser) {
      window.location.href = "/auth/sign-in";
      return;
    }

    const nextGoing = !target.isGoing;
    const me: Attendee = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      image: currentUser.image,
    };

    // Optimistic update.
    const apply = (going: boolean) =>
      setEvents((prev) =>
        prev
          .map((e) => {
            if (e.id !== target.id) return e;
            const attendees = going
              ? [...e.attendees.filter((a) => a.id !== me.id), me]
              : e.attendees.filter((a) => a.id !== me.id);
            return {
              ...e,
              isGoing: going,
              goingCount: attendees.length,
              attendees,
            };
          })
          // In "Going" view, drop events we just un-RSVP'd from.
          .filter((e) => !mineOnly || e.isGoing),
      );

    apply(nextGoing);

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: target.id }),
      });
      if (!res.ok) throw new Error("rsvp failed");
      const data = (await res.json()) as { going: boolean };
      if (data.going !== nextGoing) apply(data.going);
    } catch {
      apply(target.isGoing); // revert
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: ai founder mixer, hackathon, design jam…"
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-base shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {signedIn && (
          <div className="inline-flex shrink-0 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
            <SegButton active={!mineOnly} onClick={() => setMineOnly(false)}>
              All events
            </SegButton>
            <SegButton active={mineOnly} onClick={() => setMineOnly(true)}>
              Going
            </SegButton>
          </div>
        )}
      </div>

      <div className="mt-3 h-5 text-sm text-neutral-400">
        {loading
          ? "Searching…"
          : `${events.length} event${events.length === 1 ? "" : "s"}${
              mineOnly ? " you're going to" : ""
            }`}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            signedIn={signedIn}
            onToggle={() => toggleGoing(event)}
          />
        ))}
      </ul>

      {events.length === 0 && !loading && (
        <p className="mt-16 text-center text-neutral-400">
          {mineOnly
            ? "You haven't RSVP'd to anything yet."
            : "No events found."}
        </p>
      )}
    </div>
  );
}

function EventCard({
  event,
  signedIn,
  onToggle,
}: {
  event: EventItem;
  signedIn: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <a href={event.url} target="_blank" rel="noreferrer" className="block flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold leading-snug tracking-tight text-neutral-900 group-hover:underline">
            {event.title}
          </h2>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${sourceColor(event.source)}`}>
            {event.source}
          </span>
        </div>

        {event.startsAt && (
          <p className="mt-2 text-sm font-medium text-neutral-700">
            {formatDate(event.startsAt)}
          </p>
        )}
        {event.location && (
          <p className="text-sm text-neutral-500">{event.location}</p>
        )}
        {event.description && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
            {event.description}
          </p>
        )}
      </a>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        <Attendees attendees={event.attendees} goingCount={event.goingCount} />
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            event.isGoing
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
          }`}
        >
          {event.isGoing ? "✓ Going" : signedIn ? "Going?" : "Sign in to RSVP"}
        </button>
      </div>
    </li>
  );
}

function Attendees({
  attendees,
  goingCount,
}: {
  attendees: Attendee[];
  goingCount: number;
}) {
  if (goingCount === 0) {
    return <span className="text-xs text-neutral-400">Be the first to go</span>;
  }

  const shown = attendees.slice(0, 4);
  const extra = goingCount - shown.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((a) => (
          <Avatar key={a.id} attendee={a} />
        ))}
        {extra > 0 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[10px] font-medium text-neutral-600">
            +{extra}
          </span>
        )}
      </div>
      <span className="text-xs text-neutral-500">
        {goingCount} going
      </span>
    </div>
  );
}

function Avatar({ attendee }: { attendee: Attendee }) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = attendee.name || attendee.email;
  const initials = (attendee.name || attendee.email)
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (attendee.image && !imgFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={attendee.image}
        alt=""
        title={label}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-7 w-7 shrink-0 rounded-full border-2 border-white bg-neutral-100 object-cover"
      />
    );
  }

  return (
    <span
      title={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-rose-400 to-sky-400 text-[10px] font-semibold text-white"
    >
      {initials}
    </span>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-neutral-900 text-white shadow-sm"
          : "text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function sourceColor(source: string): string {
  const map: Record<string, string> = {
    luma: "bg-rose-100 text-rose-700",
    substack: "bg-orange-100 text-orange-700",
    eventbrite: "bg-sky-100 text-sky-700",
  };
  return map[source.toLowerCase()] ?? "bg-neutral-100 text-neutral-500";
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
