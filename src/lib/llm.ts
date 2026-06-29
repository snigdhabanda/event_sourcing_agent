import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client for the crawl agent.
 *
 * Routing precedence:
 *   1. Neon AI Gateway — used when NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL
 *      are set (both populated by `neonctl env pull`). The SDK appends /v1/messages
 *      to baseURL, so the gateway base is `${host}/ai-gateway/anthropic`.
 *   2. Direct Anthropic — uses ANTHROPIC_API_KEY (with optional ANTHROPIC_BASE_URL
 *      override) when no gateway token is present.
 */
const gatewayToken = process.env.NEON_AI_GATEWAY_TOKEN;
const gatewayBase = process.env.NEON_AI_GATEWAY_BASE_URL;
const useGateway = Boolean(gatewayToken && gatewayBase);

const apiKey = useGateway ? gatewayToken : process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    "No Anthropic credential: set NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL " +
      "for the Neon AI Gateway, or ANTHROPIC_API_KEY to call Anthropic directly.",
  );
}

export const anthropic = new Anthropic({
  apiKey,
  ...(useGateway
    ? { baseURL: `${gatewayBase}/ai-gateway/anthropic` }
    : process.env.ANTHROPIC_BASE_URL
      ? { baseURL: process.env.ANTHROPIC_BASE_URL }
      : {}),
});

export const AGENT_MODEL = "claude-opus-4-8";
