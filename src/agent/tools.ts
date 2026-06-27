import type Anthropic from "@anthropic-ai/sdk";

/**
 * The agent's entire tool surface — two tools:
 *   fetch_url      → the navigation primitive (load a page's text)
 *   record_events  → terminal: submit the structured result, ends the loop
 *
 * Embedding and database writes are NOT tools — they run as deterministic
 * code after the agent returns, so the model can't touch the DB.
 */

export const fetchUrlTool: Anthropic.Tool = {
  name: "fetch_url",
  description:
    "Fetch a web page and return its readable text content. Use it to load the " +
    "source page, and to follow a link to a sub-page ONLY if the listing itself " +
    "is missing essential event details. Prefer extracting everything from the " +
    "listing page — fetches are budgeted.",
  input_schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "Absolute URL to fetch." },
    },
    required: ["url"],
  },
};

export const recordEventsTool: Anthropic.Tool = {
  name: "record_events",
  description:
    "Record the structured events you extracted. Call this exactly ONCE when you " +
    "are finished. Calling it ends the task.",
  input_schema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        description: "Every distinct event found. May be empty if none.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Event name." },
            description: {
              type: "string",
              description: "Short description if available; omit if none.",
            },
            starts_at: {
              type: "string",
              description:
                "Start time as ISO 8601 with timezone offset. Omit if unknown.",
            },
            ends_at: {
              type: "string",
              description: "End time as ISO 8601 with timezone offset. Omit if unknown.",
            },
            location: {
              type: "string",
              description: "Venue/city. Omit if unknown.",
            },
            url: {
              type: "string",
              description:
                "Canonical link to this specific event (e.g. its Luma URL).",
            },
          },
          required: ["title", "url"],
        },
      },
    },
    required: ["events"],
  },
};

export const tools: Anthropic.Tool[] = [fetchUrlTool, recordEventsTool];
