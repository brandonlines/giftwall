// Edge Function: public-profile
// Renders a user's public "Linktree for gifts" page as server-side HTML at
// gift-well.ca/u/<handle> (point that path at this function via a rewrite, or
// hit it directly at /functions/v1/public-profile/<handle> or ?u=<handle>).
//
// SURPRISE WALL: this is a public, unauthenticated page. It uses the service
// role but selects ONLY safe, owner-published fields — the profile's handle,
// display name and avatar, plus the items of wishlists the owner explicitly
// marked is_public. It NEVER reads claims, contributions or reservations, so
// nothing about who's buying what is exposed — not to a stranger, not to the
// recipient viewing their own page. Items only.
//
// Auth: none (verify_jwt = false in config.toml). Read-only.
//
// Deploy:  npx supabase functions deploy public-profile

import { createClient } from "jsr:@supabase/supabase-js@2";

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;
const BRAND = "giftwall";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "";
  const amount = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sym = currency && currency !== "USD" ? `${currency} ` : "$";
  return `${sym}${amount}`;
}

type ProfileRow = { id: string; display_name: string | null; avatar_url: string | null; username: string };
type ListRow = { id: string; title: string };
type ItemRow = {
  list_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  note: string | null;
};

function page(opts: { title: string; description: string; image: string | null; body: string }): string {
  const og = [
    `<meta property="og:title" content="${esc(opts.title)}" />`,
    `<meta property="og:description" content="${esc(opts.description)}" />`,
    `<meta property="og:type" content="profile" />`,
    opts.image ? `<meta property="og:image" content="${esc(opts.image)}" />` : "",
    `<meta name="twitter:card" content="${opts.image ? "summary_large_image" : "summary"}" />`,
  ].join("\n    ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(opts.title)}</title>
    <meta name="description" content="${esc(opts.description)}" />
    ${og}
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #f6f7f9; color: #1a1d21; -webkit-font-smoothing: antialiased; }
      @media (prefers-color-scheme: dark) { body { background: #0f1115; color: #e8eaed; } .card, .head { background: #181b20 !important; } }
      .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 64px; }
      .head { background: #fff; border-radius: 20px; padding: 28px 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
      .avatar { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; background: #e3e6ea; margin: 0 auto 12px; display: block; }
      .avatar-fallback { display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: 700; color: #8a929c; }
      h1 { font-size: 22px; margin: 0 0 2px; }
      .handle { color: #8a929c; font-size: 14px; margin: 0; }
      .list { margin-top: 28px; }
      .list h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .04em; color: #8a929c; margin: 0 0 10px 4px; }
      .card { display: flex; gap: 14px; align-items: center; background: #fff; border-radius: 16px; padding: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,.05); margin-bottom: 10px; text-decoration: none; color: inherit; }
      .thumb { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; background: #eceef1; flex: none; }
      .meta { flex: 1; min-width: 0; }
      .meta .t { font-weight: 600; font-size: 16px; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .meta .p { color: #5b636d; font-size: 14px; margin: 0; }
      .chev { color: #b7bec7; font-size: 20px; flex: none; }
      .empty { text-align: center; color: #8a929c; margin-top: 36px; line-height: 1.5; }
      .foot { text-align: center; margin-top: 40px; }
      .foot a { color: #8a929c; font-size: 13px; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${opts.body}
      <div class="foot"><a href="https://www.gift-well.ca">Make your own gift wishlist on ${BRAND} →</a></div>
    </div>
  </body>
</html>`;
}

function notFound(): Response {
  const body = `<div class="head"><h1>Profile not found</h1><p class="handle">This giftwall page doesn't exist or is private.</p></div>`;
  return new Response(page({ title: `Not found · ${BRAND}`, description: "This page is private or doesn't exist.", image: null, body }), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function renderItem(it: ItemRow): string {
  const price = formatPrice(it.price_cents, it.currency);
  const safeUrl = it.url && isSafeHttpUrl(it.url) ? it.url : null;
  const thumb = it.image_url && isSafeHttpUrl(it.image_url)
    ? `<img class="thumb" src="${esc(it.image_url)}" alt="" loading="lazy" />`
    : `<div class="thumb"></div>`;
  const inner = `
        ${thumb}
        <div class="meta">
          <p class="t">${esc(it.title)}</p>
          ${price ? `<p class="p">${esc(price)}</p>` : it.note ? `<p class="p">${esc(it.note)}</p>` : ""}
        </div>
        ${safeUrl ? `<div class="chev">›</div>` : ""}`;
  return safeUrl
    ? `<a class="card" href="${esc(safeUrl)}" target="_blank" rel="noopener nofollow">${inner}</a>`
    : `<div class="card">${inner}</div>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("u");
  const segs = url.pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  const raw = (fromQuery ?? (last && last !== "public-profile" ? last : "")).toLowerCase();
  if (!USERNAME_RE.test(raw)) return notFound();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url, username")
    .eq("username", raw)
    .maybeSingle<ProfileRow>();
  if (!profile) return notFound();

  const { data: lists } = await admin
    .from("wishlists")
    .select("id, title")
    .eq("owner_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  const listIds = (lists ?? []).map((l: ListRow) => l.id);
  const itemsByList = new Map<string, ItemRow[]>();
  if (listIds.length > 0) {
    const { data: items } = await admin
      .from("items")
      .select("list_id, title, url, image_url, price_cents, currency, note")
      .in("list_id", listIds)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    for (const it of (items ?? []) as ItemRow[]) {
      const arr = itemsByList.get(it.list_id) ?? [];
      arr.push(it);
      itemsByList.set(it.list_id, arr);
    }
  }

  const name = profile.display_name?.trim() || `@${profile.username}`;
  const initial = (profile.display_name?.trim() || profile.username).charAt(0).toUpperCase();
  const avatar = profile.avatar_url && isSafeHttpUrl(profile.avatar_url)
    ? `<img class="avatar" src="${esc(profile.avatar_url)}" alt="" />`
    : `<div class="avatar avatar-fallback">${esc(initial)}</div>`;

  const sections = (lists ?? [])
    .map((l: ListRow) => {
      const items = itemsByList.get(l.id) ?? [];
      if (items.length === 0) return "";
      return `<div class="list"><h2>${esc(l.title)}</h2>${items.map(renderItem).join("")}</div>`;
    })
    .filter(Boolean)
    .join("\n");

  const body = `
      <div class="head">
        ${avatar}
        <h1>${esc(name)}</h1>
        <p class="handle">@${esc(profile.username)}</p>
      </div>
      ${sections || `<p class="empty">No public lists yet.<br/>Check back soon! 🎁</p>`}`;

  return new Response(
    page({
      title: `${name}'s gift wishlist · ${BRAND}`,
      description: `See what ${name} is wishing for and claim a gift on ${BRAND}.`,
      image: profile.avatar_url && isSafeHttpUrl(profile.avatar_url) ? profile.avatar_url : null,
      body,
    }),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=120" } },
  );
});
