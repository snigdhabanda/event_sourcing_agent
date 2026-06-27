import { sql } from "drizzle-orm";
import {
  customType,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * Postgres `tsvector` has no first-class Drizzle column type, so we declare a
 * minimal custom type. The column itself is GENERATED (see `searchTsv` below),
 * so we never write to it directly.
 */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),

    // Canonical link to the event. Unique → re-crawling the SAME source is idempotent.
    url: text("url").notNull(),
    // Which source produced this row: "substack" | "luma" | ...
    source: text("source").notNull(),

    // Identity across sources: lower(trim(title)) + '|' + date(starts_at) + '|' + location.
    // Unique → the same event arriving from Substack AND Luma collapses to one row.
    dedupeKey: text("dedupe_key").notNull(),

    // OpenAI text-embedding-3-small → 1536 dims. Nullable until embedded.
    embedding: vector("embedding", { dimensions: 1536 }),

    // Full-text search vector, generated from title + description.
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))`,
    ),

    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("events_url_unique").on(t.url),
    uniqueIndex("events_dedupe_key_unique").on(t.dedupeKey),
    // GIN index powers keyword / full-text search.
    index("events_search_tsv_idx").using("gin", t.searchTsv),
    // HNSW index powers semantic / vector-similarity search (cosine distance).
    index("events_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
