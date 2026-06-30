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

if (!useGateway && !process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "No Anthropic credential: set NEON_AI_GATEWAY_TOKEN + NEON_AI_GATEWAY_BASE_URL " +
      "for the Neon AI Gateway, or ANTHROPIC_API_KEY to call Anthropic directly.",
  );
}

export const anthropic = useGateway
  ? new Anthropic({
      // The Neon AI Gateway authenticates with `Authorization: Bearer <token>`,
      // not the `x-api-key` header the SDK sends for `apiKey`. `authToken` sets
      // bearer auth; `apiKey: null` stops the SDK reading ANTHROPIC_API_KEY too.
      authToken: gatewayToken,
      apiKey: null,
      baseURL: `${gatewayBase}/ai-gateway/anthropic`,
    })
  : new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      ...(process.env.ANTHROPIC_BASE_URL
        ? { baseURL: process.env.ANTHROPIC_BASE_URL }
        : {}),
    });

export const AGENT_MODEL = "claude-opus-4-8";
