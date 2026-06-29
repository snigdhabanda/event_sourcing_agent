/**
 * Local crawl runner — runs the SAME pipeline as /api/crawl, but invoked
 * directly (no QStash, no signature). Use it to test extraction and DB writes
 * locally, or to manually re-crawl a single source.
 *
 *   node --env-file=.env --import tsx scripts/crawl-local.ts <sourceId> [--dry]
 *
 *   --dry   extract and print events only; do NOT embed or write to the DB
 *           (no OpenAI call — useful to confirm scraping before spending tokens)
 *
 * Examples:
 *   node --env-file=.env --import tsx scripts/crawl-local.ts luma-sf --dry
 *   node --env-file=.env --import tsx scripts/crawl-local.ts luma-sf
 */
import { neon } from "@neondatabase/serverless";
import { extractEvents } from "@/adapters";
import { persistEvents } from "@/pipeline/upsert";
import { getSource } from "@/sources";

async function main() {
  const sourceId = process.argv[2];
  const dry = process.argv.includes("--dry");

  if (!sourceId) {
    console.error("usage: crawl-local.ts <sourceId> [--dry]");
    process.exit(1);
  }

  const source = getSource(sourceId);
  if (!source) {
    console.error(`unknown source: ${sourceId}`);
    process.exit(1);
  }

  console.log(`\n▶ extracting: ${source.id} (${source.kind}) — ${source.url}\n`);
  const extracted = await extractEvents(source);
  console.log(`extracted ${extracted.length} event(s):`);
  for (const e of extracted) {
    console.log(`  • ${e.title}`);
    console.log(`      when: ${e.startsAt ?? "—"}   where: ${e.location ?? "—"}`);
    console.log(`      url:  ${e.url}`);
  }

  if (dry) {
    console.log(`\n(dry run — nothing written to the database)\n`);
    return;
  }

  console.log(`\n▶ persisting (embed new/changed + upsert)…`);
  const result = await persistEvents(extracted, source);
  console.log(`result:`, result);

  // Read back what's now in the DB for a quick eyeball.
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    select id, title, starts_at, location, source,
           (embedding is not null) as has_embedding
    from events
    order by starts_at nulls last
    limit 50
  `;
  console.log(`\n▶ events table now holds ${rows.length} row(s) (showing up to 50):`);
  for (const r of rows as Record<string, unknown>[]) {
    console.log(
      `  [${r.source}] ${r.title} — ${r.starts_at ?? "—"} — embedded=${r.has_embedding}`,
    );
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
