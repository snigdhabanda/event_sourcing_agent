import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

/**
 * Anthropic client for the crawl agent.
 *
 * Gateway-ready: set ANTHROPIC_BASE_URL to route through the Neon AI Gateway
 * branch endpoint instead of api.anthropic.com — no other code changes needed.
 * Left unset, it calls Anthropic directly.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(process.env.ANTHROPIC_BASE_URL
    ? { baseURL: process.env.ANTHROPIC_BASE_URL }
    : {}),
});

export const AGENT_MODEL = "claude-opus-4-8";
