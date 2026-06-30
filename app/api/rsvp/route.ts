import { auth } from "@/lib/auth/server";
import { toggleRsvp } from "@/db/queries";

export const runtime = "nodejs";

/**
 * Toggle the signed-in user's RSVP for an event.
 *   POST /api/rsvp  { eventId }  →  { going: boolean }
 */
export async function POST(req: Request) {
  const { data } = await auth.getSession();
  const userId = data?.user?.id;
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { eventId?: string } | null;
  const eventId = body?.eventId;
  if (typeof eventId !== "string" || !eventId) {
    return Response.json({ error: "eventId is required" }, { status: 400 });
  }

  const result = await toggleRsvp(userId, eventId);
  return Response.json(result);
}
