import { runAgent } from "@/agent/runAgent";
import { extractLumaEvents } from "./luma";
import type { ExtractedEvent, Source } from "./types";

export type { ExtractedEvent, Source, SourceKind } from "./types";

/**
 * Route a source to its extraction strategy:
 *   - "agent"      → Claude tool-use loop (unstructured pages, e.g. Substack prose)
 *   - "structured" → direct parse of embedded JSON (Luma)
 *
 * Both paths return ExtractedEvent[]; the pipeline handles embed + upsert.
 */
export async function extractEvents(
  source: Source,
): Promise<ExtractedEvent[]> {
  switch (source.kind) {
    case "agent":
      return runAgent(source);
    case "structured":
      // Both structured sources are Luma today. When other structured sources
      // arrive, dispatch by source.name here.
      return extractLumaEvents(source);
    default: {
      const _exhaustive: never = source.kind;
      throw new Error(`Unknown source kind: ${String(_exhaustive)}`);
    }
  }
}
