import { sql } from "drizzle-orm";
import { db } from "./client";

export type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  location: string | null;
  url: string;
  source: string;
  score: number;
};

export type EventListItem = Omit<SearchResult, "score">;

// pgvector accepts a vector literal of the form '[0.1,0.2,...]'.
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Hybrid search: full-text (tsvector/GIN) + vector similarity (pgvector/HNSW),
 * fused with Reciprocal Rank Fusion. Each candidate scores 1/(k+rank) from each
 * list; the sum ranks the final results. Past events are filtered out.
 *
 * k = 60 is the conventional RRF constant.
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  limit = 20,
): Promise<SearchResult[]> {
  const vec = toVectorLiteral(queryEmbedding);

  const result = await db.execute(sql`
    with kw as (
      select id,
             row_number() over (
               order by ts_rank(search_tsv, plainto_tsquery('english', ${query})) desc
             ) as rank
      from events
      where search_tsv @@ plainto_tsquery('english', ${query})
        and (starts_at is null or starts_at >= now())
      limit 50
    ),
    vec as (
      select id,
             row_number() over (order by embedding <=> ${vec}::vector) as rank
      from events
      where embedding is not null
        and (starts_at is null or starts_at >= now())
      limit 50
    )
    select e.id,
           e.title,
           e.description,
           e.starts_at as "startsAt",
           e.location,
           e.url,
           e.source,
           coalesce(1.0 / (60 + kw.rank), 0) + coalesce(1.0 / (60 + vec.rank), 0) as score
    from events e
    left join kw  on kw.id  = e.id
    left join vec on vec.id = e.id
    where (kw.id is not null or vec.id is not null)
      and (e.starts_at is null or e.starts_at >= now())
    order by score desc
    limit ${limit}
  `);

  return result.rows as unknown as SearchResult[];
}

/** Upcoming events for the homepage (no query), soonest first. */
export async function listUpcomingEvents(limit = 100): Promise<EventListItem[]> {
  const result = await db.execute(sql`
    select id, title, description, starts_at as "startsAt", location, url, source
    from events
    where starts_at is null or starts_at >= now()
    order by starts_at asc nulls last
    limit ${limit}
  `);

  return result.rows as unknown as EventListItem[];
}

/** A user who has RSVP'd, joined from the Better-Auth-managed user table. */
export type Attendee = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

/** An event plus its RSVP social data. */
export type EnrichedEvent<T> = T & {
  attendees: Attendee[];
  goingCount: number;
  isGoing: boolean;
};

/**
 * Decorate a list of events with their attendees (who's going) and whether the
 * current user is going. One extra query joins rsvps → neon_auth."user".
 */
export async function attachRsvps<T extends { id: string }>(
  events: T[],
  currentUserId: string | null,
): Promise<EnrichedEvent<T>[]> {
  if (events.length === 0) return [];

  const ids = events.map((e) => e.id);
  // A JS array in a drizzle template serializes to a record `(a,b,…)`, which
  // can't cast to uuid[]; build an explicit, parameterized IN list instead.
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const result = await db.execute(sql`
    select r.event_id as "eventId", u.id, u.name, u.email, u.image
    from rsvps r
    join neon_auth."user" u on u.id = r.user_id
    where r.event_id::text in (${idList})
    order by r.created_at asc
  `);

  const byEvent = new Map<string, Attendee[]>();
  for (const row of result.rows as unknown as (Attendee & { eventId: string })[]) {
    const list = byEvent.get(row.eventId) ?? [];
    list.push({ id: row.id, name: row.name, email: row.email, image: row.image });
    byEvent.set(row.eventId, list);
  }

  return events.map((e) => {
    const attendees = byEvent.get(e.id) ?? [];
    return {
      ...e,
      attendees,
      goingCount: attendees.length,
      isGoing: currentUserId
        ? attendees.some((a) => a.id === currentUserId)
        : false,
    };
  });
}

/** Toggle the current user's RSVP for an event. Returns the new state. */
export async function toggleRsvp(
  userId: string,
  eventId: string,
): Promise<{ going: boolean }> {
  const deleted = await db.execute(sql`
    delete from rsvps where user_id = ${userId} and event_id = ${eventId}
    returning id
  `);
  if (deleted.rows.length > 0) return { going: false };

  await db.execute(sql`
    insert into rsvps (user_id, event_id) values (${userId}, ${eventId})
    on conflict (user_id, event_id) do nothing
  `);
  return { going: true };
}
