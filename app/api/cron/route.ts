import { publishCrawlJob } from "@/lib/qstash";
import { enabledSources } from "@/sources";

export const runtime = "nodejs";

/**
 * Weekly Vercel Cron target. Publishes one QStash job per enabled source and
 * returns immediately — the actual crawling happens in /api/crawl per job.
 */
export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sources = enabledSources();
  await Promise.all(sources.map((s) => publishCrawlJob({ sourceId: s.id })));

  return Response.json({ enqueued: sources.map((s) => s.id) });
}
