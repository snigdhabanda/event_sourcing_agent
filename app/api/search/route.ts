import type { NextRequest } from "next/server";
import { hybridSearch, listUpcomingEvents } from "@/db/queries";
import { embedQuery } from "@/lib/embeddings";

export const runtime = "nodejs";

/**
 * Public read endpoint.
 *   GET /api/search          → upcoming events (no query)
 *   GET /api/search?q=...     → hybrid search (full-text + vector, RRF-fused)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    const results = await listUpcomingEvents();
    return Response.json({ query: null, results });
  }

  const queryEmbedding = await embedQuery(q);
  const results = await hybridSearch(q, queryEmbedding);
  return Response.json({ query: q, results });
}
