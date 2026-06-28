CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"embedding" vector(1536),
	"search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "events_url_unique" ON "events" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "events_dedupe_key_unique" ON "events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "events_search_tsv_idx" ON "events" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "events_embedding_idx" ON "events" USING hnsw ("embedding" vector_cosine_ops);