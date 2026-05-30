// Edge Function: scrape-link
// Takes { url }, fetches the page, parses OpenGraph metadata, returns
// { title, image, price_cents, currency }.
//
// SSRF is the real risk here — we're fetching user-supplied URLs from inside
// our infrastructure. Guards below: https/http only, DNS resolved and checked
// against private ranges, and redirects followed manually so each hop is
// re-validated (a public URL can 302 to http://169.254.169.254/...).
//
// Deploy:  npx supabase functions deploy scrape-link
// Local:   npx supabase functions serve scrape-link

import { corsHeaders } from "../_shared/cors.ts";

const MAX_REDIRECTS = 4;
const MAX_BYTES = 1_000_000; // 1 MB of HTML is plenty for meta tags
const FETCH_TIMEOUT_MS = 8000;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable -> treat as unsafe
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (b & mask);
  };
  return (
    inRange("10.0.0.0", 8) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.168.0.0", 16) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) || // link-local incl. cloud metadata
    inRange("0.0.0.0", 8) ||
    inRange("100.64.0.0", 10) || // CGNAT
    inRange("192.0.0.0", 24) ||
    inRange("198.18.0.0", 15)
  );
}

function isPrivateIpv6(ip: string): boolean {
  const a = ip.toLowerCase();
  if (a === "::1" || a === "::") return true;
  if (a.startsWith("fe80") || a.startsWith("fc") || a.startsWith("fd")) return true;
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

async function assertSafeHost(hostname: string): Promise<void> {
  // Literal IPs
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) throw new Error("blocked address");
    return;
  }
  if (hostname.includes(":")) {
    if (isPrivateIpv6(hostname)) throw new Error("blocked address");
    return;
  }
  if (hostname === "localhost" || hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    throw new Error("blocked host");
  }
  // Resolve and check every record.
  const addrs: string[] = [];
  for (const t of ["A", "AAAA"] as const) {
    try {
      addrs.push(...(await Deno.resolveDns(hostname, t)));
    } catch {
      // record type may not exist
    }
  }
  if (addrs.length === 0) throw new Error("could not resolve host");
  for (const a of addrs) {
    if (a.includes(":") ? isPrivateIpv6(a) : isPrivateIpv4(a)) {
      throw new Error("resolves to a private address");
    }
  }
}

async function safeFetch(rawUrl: string): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = new URL(current);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("only http(s) URLs are allowed");
    }
    await assertSafeHost(u.hostname);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(u.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": "giftwall-link-preview/1.0" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, u).toString(); // re-validate next loop
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

function metaContent(html: string, property: string): string | null {
  // Matches <meta property="og:x" content="..."> in either attribute order.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parsePriceCents(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.replace(/,/g, "").match(/(\d+(\.\d{1,2})?)/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url) {
      return json({ error: "url is required" }, 400);
    }

    const res = await safeFetch(url);
    if (!res.ok) return json({ error: `upstream ${res.status}` }, 502);

    // Read at most MAX_BYTES of the body.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
      await reader.cancel();
    }

    const title =
      metaContent(html, "og:title") ??
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ??
      null;
    const image = metaContent(html, "og:image");
    const currency =
      metaContent(html, "og:price:currency") ??
      metaContent(html, "product:price:currency");
    const price_cents = parsePriceCents(
      metaContent(html, "og:price:amount") ??
        metaContent(html, "product:price:amount"),
    );

    return json({ title, image, price_cents, currency });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 400);
  }
});
