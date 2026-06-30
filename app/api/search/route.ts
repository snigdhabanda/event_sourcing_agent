import type { NextRequest } from "next/server";
import { hybridSearch, listUpcomingEvents, attachRsvps } from "@/db/queries";
import { embedQuery } from "@/lib/embeddings";
import { getCurrentUser } from "@/lib/auth/server";

export const runtime = "nodejs";

/**
 * Read endpoint, enriched with RSVP social data.
 *   GET /api/search          → upcoming events
 *   GET /api/search?q=...     → hybrid search (full-text + vector, RRF-fused)
 *
 * Each result includes `attendees`, `goingCount`, and `isGoing` (for the
 * current user). When `mine=1`, only events the current user is going to.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const mineOnly = req.nextUrl.searchParams.get("mine") === "1";

  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const base = q
    ? await hybridSearch(q, await embedQuery(q))
    : await listUpcomingEvents();

  let results = await attachRsvps(base, userId);
  if (mineOnly) results = results.filter((e) => e.isGoing);

  return Response.json({ query: q ?? null, results, currentUserId: userId });
}
