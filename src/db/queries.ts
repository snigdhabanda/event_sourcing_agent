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
