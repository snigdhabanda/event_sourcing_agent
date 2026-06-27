import { extractEvents } from "@/adapters";
import { verifySignatureAppRouter } from "@/lib/qstash";
import { persistEvents } from "@/pipeline/upsert";
import { getSource } from "@/sources";

export const runtime = "nodejs";
// One source per invocation. 300s needs Vercel Pro; Hobby caps at 60s.
export const maxDuration = 300;

/**
 * QStash consumer — runs ONE source's full pipeline: extract → embed → upsert.
 * Idempotent (write-time dedup), so QStash retries are safe.
 */
async function handler(req: Request) {
  const { sourceId } = (await req.json()) as { sourceId?: string };
  if (!sourceId) {
    return Response.json({ error: "missing sourceId" }, { status: 400 });
  }

  const source = getSource(sourceId);
  if (!source) {
    return Response.json({ error: `unknown source: ${sourceId}` }, { status: 404 });
  }

  const extracted = await extractEvents(source);
  const result = await persistEvents(extracted, source);

  // Loud signal for the "source structure changed" failure mode.
  if (result.extracted === 0) {
    console.warn(`[crawl] ${source.id} extracted 0 events — source may have changed`);
  }
  console.log(`[crawl] ${source.id}`, result);

  return Response.json({ source: source.id, ...result });
}

// Only QStash-signed requests get through.
export const POST = verifySignatureAppRouter(handler);
