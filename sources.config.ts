import type { Source } from "@/adapters/types";

/**
 * The crawl sources. `id` is stable and travels in the QStash job; `name` is
 * stored as events.source. Toggle `enabled` to include/exclude a source.
 */
export const sources: Source[] = [
  {
    id: "bayareafoundersclub",
    name: "substack",
    // NOTE: this is a single weekly post — its URL changes each week. See README
    // "Source maintenance" for the options (update weekly vs. crawl from the
    // publication root and let the agent find the latest post).
    url: "https://bayareafoundersclub.substack.com/p/bay-area-events-for-the-week-of-june-d1e",
    kind: "agent",
    enabled: true,
  },
  {
    id: "luma-sf",
    name: "luma",
    url: "https://luma.com/sf",
    kind: "structured",
    enabled: true,
  },
  {
    id: "luma-ai-sf",
    name: "luma",
    url: "https://luma.com/ai-sf",
    kind: "structured",
    enabled: true,
  },
];

export function getSource(id: string): Source | undefined {
  return sources.find((s) => s.id === id);
}

export function enabledSources(): Source[] {
  return sources.filter((s) => s.enabled);
}
