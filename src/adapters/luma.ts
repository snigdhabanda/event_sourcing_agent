import { fetchHtml } from "@/lib/fetchPage";
import type { ExtractedEvent, Source } from "./types";

/**
 * Luma is a Next.js app that server-renders its event data into a
 * <script id="__NEXT_DATA__"> JSON blob. We fetch the page and read that blob
 * directly — no headless browser, no API key. Verified shape (2026-06):
 *   props.pageProps.initialData.data.events[].event
 */

interface LumaGeo {
  city?: string | null;
  city_state?: string | null;
  sublocality?: string | null;
  region?: string | null;
}

interface LumaEvent {
  api_id: string;
  name?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  url?: string | null; // slug, e.g. "0ymovy7x"
  geo_address_info?: LumaGeo | null;
}

function extractNextData(html: string): unknown | null {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function collectEvents(nextData: any): LumaEvent[] {
  // Preferred deterministic path.
  const direct = nextData?.props?.pageProps?.initialData?.data?.events;
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map((e: any) => e?.event).filter(Boolean);
  }

  // Fallback: walk the tree for { event: { api_id: 'evt-...' } } wrappers,
  // so a minor restructure of the page doesn't break extraction outright.
  const out: LumaEvent[] = [];
  const seen = new Set<string>();
  const walk = (o: any) => {
    if (Array.isArray(o)) {
      o.forEach(walk);
      return;
    }
    if (o && typeof o === "object") {
      const ev = o.event;
      if (
        ev &&
        typeof ev.api_id === "string" &&
        ev.api_id.startsWith("evt-") &&
        !seen.has(ev.api_id)
      ) {
        seen.add(ev.api_id);
        out.push(ev);
      }
      for (const v of Object.values(o)) walk(v);
    }
  };
  walk(nextData);
  return out;
}

function formatLocation(geo?: LumaGeo | null): string | null {
  if (!geo) return null;
  const parts = [geo.sublocality, geo.city_state ?? geo.city].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export async function extractLumaEvents(
  source: Source,
): Promise<ExtractedEvent[]> {
  const html = await fetchHtml(source.url);
  const nextData = extractNextData(html);
  if (!nextData) {
    throw new Error(
      `Luma: no __NEXT_DATA__ at ${source.url} — page structure may have changed`,
    );
  }

  return collectEvents(nextData)
    .filter((e): e is LumaEvent & { name: string; url: string } =>
      Boolean(e?.name && e?.url),
    )
    .map((e) => ({
      title: e.name,
      description: null, // listing carries no description; we stay on the listing by design
      startsAt: e.start_at ?? null,
      endsAt: e.end_at ?? null,
      location: formatLocation(e.geo_address_info),
      url: `https://lu.ma/${e.url}`,
    }));
}
