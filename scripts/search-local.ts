/**
 * Local search runner — exercises the same query path as /api/search:
 * embed the query, then hybrid (keyword + vector) search with RRF.
 *
 *   node --env-file=.env --import tsx scripts/search-local.ts "<query>"
 */
import { embedQuery } from "@/lib/embeddings";
import { hybridSearch } from "@/db/queries";

async function main() {
  const q = process.argv.slice(2).join(" ").trim();
  if (!q) {
    console.error('usage: search-local.ts "<query>"');
    process.exit(1);
  }

  console.log(`\n▶ query: "${q}"\n`);
  const vec = await embedQuery(q);
  const results = await hybridSearch(q, vec);

  console.log(`${results.length} result(s):`);
  for (const r of results) {
    console.log(`  • ${r.title}`);
    console.log(`      ${r.startsAt ?? "—"}  |  ${r.location ?? "—"}`);
    console.log(`      ${r.url}`);
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
