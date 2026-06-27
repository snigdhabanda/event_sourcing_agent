export type SourceKind = "agent" | "structured";

export interface Source {
  /** Stable id — carried in the QStash job, used to look the source back up. */
  id: string;
  /** Stored as events.source, e.g. "substack" | "luma". */
  name: string;
  url: string;
  kind: SourceKind;
  enabled: boolean;
}

/**
 * What every adapter produces. The pipeline turns these into rows:
 * it computes the dedupe key, embeds, and stamps `source` before upserting.
 */
export interface ExtractedEvent {
  title: string;
  description?: string | null;
  /** ISO 8601 (with timezone offset). */
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string | null;
  /** Canonical event URL — used for same-source idempotency. */
  url: string;
}
