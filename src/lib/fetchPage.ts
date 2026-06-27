const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Fetch raw HTML server-side. Returns the unmodified body so callers can either
 * clean it to text (the agent's fetch_url tool) or scrape embedded JSON out of
 * it (the Luma adapter).
 */
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`fetchHtml ${url} failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Strip scripts/styles/markup down to readable text — enough for the LLM to
 * extract events from prose. Dependency-free; not a full DOM parse.
 */
export function cleanHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
