import { eq, inArray, or } from "drizzle-orm";
import type { ExtractedEvent, Source } from "@/adapters/types";
import { db } from "@/db/client";
import { events, type NewEventRow } from "@/db/schema";
import { embeddingTextFor, embedMany } from "./embed";

/**
 * Write-time dedup key: lower(trim(title)) | YYYY-MM-DD | lower(trim(location)).
 * The same event arriving from different sources collapses to one row.
 */
function dedupeKeyFor(e: ExtractedEvent): string {
  const title = e.title.trim().toLowerCase();
  const date = e.startsAt ? e.startsAt.slice(0, 10) : "no-date";
  const loc = (e.location ?? "").trim().toLowerCase();
  return `${title}|${date}|${loc}`;
}

export interface PersistResult {
  extracted: number;
  inserted: number;
  updated: number;
  embedded: number;
}

/**
 * Persist a source's extracted events: dedup, embed only new/changed events,
 * then insert or update. Matches existing rows by dedupe key OR url so we catch
 * both cross-source duplicates and same-url edits.
 */
export async function persistEvents(
  extracted: ExtractedEvent[],
  source: Source,
): Promise<PersistResult> {
  // 1. De-duplicate within this batch by dedupe key (keep last seen).
  const byKey = new Map<string, ExtractedEvent>();
  for (const e of extracted) byKey.set(dedupeKeyFor(e), e);
  const batch = [...byKey.entries()].map(([dedupeKey, event]) => ({
    dedupeKey,
    event,
  }));

  if (batch.length === 0) {
    return { extracted: extracted.length, inserted: 0, updated: 0, embedded: 0 };
  }

  // 2. Load existing rows matching by dedupe key OR url.
  const existing = await db
    .select({
      id: events.id,
      url: events.url,
      dedupeKey: events.dedupeKey,
      title: events.title,
      description: events.description,
      location: events.location,
    })
    .from(events)
    .where(
      or(
        inArray(events.dedupeKey, batch.map((b) => b.dedupeKey)),
        inArray(events.url, batch.map((b) => b.event.url)),
      ),
    );

  const byDedupe = new Map(existing.map((r) => [r.dedupeKey, r]));
  const byUrl = new Map(existing.map((r) => [r.url, r]));

  // 3. Decide insert vs update, and which need (re)embedding.
  interface Plan {
    dedupeKey: string;
    event: ExtractedEvent;
    existingId: string | null;
    needsEmbed: boolean;
  }

  const plans: Plan[] = batch.map(({ dedupeKey, event }) => {
    const match = byDedupe.get(dedupeKey) ?? byUrl.get(event.url) ?? null;
    if (!match) return { dedupeKey, event, existingId: null, needsEmbed: true };

    // Re-embed only if the embedded fields actually changed.
    const changed =
      (match.title ?? "") !== event.title ||
      (match.description ?? "") !== (event.description ?? "") ||
      (match.location ?? "") !== (event.location ?? "");
    return { dedupeKey, event, existingId: match.id, needsEmbed: changed };
  });

  // 4. Embed only new/changed events, in one batched call.
  const toEmbed = plans.filter((p) => p.needsEmbed);
  const vectors = await embedMany(
    toEmbed.map((p) => embeddingTextFor(p.event)),
  );
  const embedByPlan = new Map<Plan, number[]>();
  toEmbed.forEach((p, i) => embedByPlan.set(p, vectors[i]));

  // 5. Write.
  let inserted = 0;
  let updated = 0;

  for (const plan of plans) {
    const { event, dedupeKey, existingId } = plan;
    const embedding = embedByPlan.get(plan); // undefined when unchanged
    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    const endsAt = event.endsAt ? new Date(event.endsAt) : null;

    if (existingId === null) {
      const row: NewEventRow = {
        title: event.title,
        description: event.description ?? null,
        startsAt,
        endsAt,
        location: event.location ?? null,
        url: event.url,
        source: source.name,
        dedupeKey,
        embedding: embedding ?? null,
      };
      // onConflictDoNothing guards against a concurrent insert of the same key.
      await db.insert(events).values(row).onConflictDoNothing();
      inserted++;
    } else {
      await db
        .update(events)
        .set({
          title: event.title,
          description: event.description ?? null,
          startsAt,
          endsAt,
          location: event.location ?? null,
          url: event.url,
          source: source.name,
          dedupeKey,
          fetchedAt: new Date(),
          ...(embedding ? { embedding } : {}),
        })
        .where(eq(events.id, existingId));
      updated++;
    }
  }

  return {
    extracted: extracted.length,
    inserted,
    updated,
    embedded: toEmbed.length,
  };
}
