import { Client } from "@upstash/qstash";

/** A crawl job carries only the source id; /api/crawl looks up the config. */
export type CrawlJob = { sourceId: string };

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    if (!process.env.QSTASH_TOKEN) {
      throw new Error("QSTASH_TOKEN is not set");
    }
    client = new Client({ token: process.env.QSTASH_TOKEN });
  }
  return client;
}

/**
 * Publish one crawl job. QStash will deliver it as an HTTP POST to
 * APP_URL/api/crawl and retry on failure.
 */
export async function publishCrawlJob(job: CrawlJob): Promise<void> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL is not set");
  }
  await getClient().publishJSON({
    url: `${appUrl}/api/crawl`,
    body: job,
    retries: 3,
  });
}

/** Wraps an App Router handler so only QStash-signed requests get through. */
export { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
