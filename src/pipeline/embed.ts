import type { ExtractedEvent } from "@/adapters/types";
import { embedMany } from "@/lib/embeddings";

/**
 * The text we embed for semantic search. We combine title + location +
 * description so a query like "outdoor founder mixer in the mission" can match
 * on meaning across all three. Mirrors what users actually search by.
 */
export function embeddingTextFor(e: ExtractedEvent): string {
  return [e.title, e.location, e.description].filter(Boolean).join(" — ");
}

export { embedMany };
