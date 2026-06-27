import type Anthropic from "@anthropic-ai/sdk";
import type { ExtractedEvent, Source } from "@/adapters/types";
import { cleanHtmlToText, fetchHtml } from "@/lib/fetchPage";
import { AGENT_MODEL, anthropic } from "@/lib/llm";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { tools } from "./tools";

// Guardrails — keep the loop bounded so it can't run away or blow the function timeout.
const MAX_FETCHES = 5; // caps navigation → keeps the agent on the listing page
const MAX_TURNS = 8;
const MAX_TEXT_CHARS = 60_000; // cap page text fed back to the model

/**
 * The per-source agent: a manual Claude tool-use loop. Claude calls fetch_url
 * to navigate, then record_events to finish. We execute the tools, enforce the
 * fetch budget, and validate the output before returning ExtractedEvent[].
 */
export async function runAgent(source: Source): Promise<ExtractedEvent[]> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserMessage(source.url) },
  ];

  let fetches = 0;
  let recorded: ExtractedEvent[] | null = null;

  for (let turn = 0; turn < MAX_TURNS && recorded === null; turn++) {
    // Streaming + finalMessage() avoids request timeouts on long extractions.
    const response = await anthropic.messages
      .stream({
        model: AGENT_MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: SYSTEM_PROMPT,
        tools,
        messages,
      })
      .finalMessage();

    // Echo the full assistant turn back (thinking + tool_use blocks preserved).
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") break; // stopped without recording

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "record_events") {
        recorded = normalizeEvents(block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Recorded ${recorded.length} events.`,
        });
        continue;
      }

      if (block.name === "fetch_url") {
        const url = (block.input as { url?: string }).url ?? "";

        if (fetches >= MAX_FETCHES) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content:
              "Fetch budget exhausted. Extract events from what you already have and call record_events now.",
          });
          continue;
        }

        fetches++;
        try {
          const text = cleanHtmlToText(await fetchHtml(url)).slice(
            0,
            MAX_TEXT_CHARS,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: text,
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: `Failed to fetch ${url}: ${(err as Error).message}`,
          });
        }
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return recorded ?? [];
}

// ── Output validation ───────────────────────────────────────────────────────
// Strictly coerce the model's output: drop events missing required fields,
// normalize dates to ISO or null. This is the guard against hallucinated rows.

interface RawEvent {
  title?: unknown;
  description?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  location?: unknown;
  url?: unknown;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function isoOrNull(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeEvents(input: unknown): ExtractedEvent[] {
  const raw = (input as { events?: RawEvent[] })?.events;
  if (!Array.isArray(raw)) return [];

  const out: ExtractedEvent[] = [];
  for (const e of raw) {
    const title = str(e.title);
    const url = str(e.url);
    if (!title || !url) continue; // required fields — drop invalid rows

    out.push({
      title,
      description: str(e.description),
      startsAt: isoOrNull(e.starts_at),
      endsAt: isoOrNull(e.ends_at),
      location: str(e.location),
      url,
    });
  }
  return out;
}
