# Deploying the giftwall web app to GitHub Pages

The same Expo codebase ships as a public web app. `.github/workflows/deploy-web.yml`
runs `expo export --platform web` and publishes the static `dist/` bundle to
GitHub Pages on every push to `main`.

- **Live URL:** https://www.gift-well.ca (GitHub Pages custom domain)
- **Auth on web:** Email one-time code + Google. **Sign in with Apple is
  native-iOS only** and is hidden in the browser by design.
- **Native-only features** (barcode scan, push notifications, share-to-app)
  degrade gracefully to a "use the app" state on the web.

> **Serving at a custom domain = root paths.** A GitHub Pages custom domain
> serves the site at `/`, so `app.json` has **no** `experiments.baseUrl` (assets
> resolve from `/_expo/...`). The workflow writes `dist/CNAME` =
> `www.gift-well.ca` on every deploy so the domain sticks. If you ever drop the
> custom domain and serve from `https://<user>.github.io/giftwall/` instead, set
> `experiments.baseUrl` back to `/giftwall` and remove the CNAME step.

---

## 0. Get this code into the public `giftwall` repo

These changes live on the `gift-well` repo's branch
`claude/great-knuth-RfMLo`. Mirror them into the public `giftwall` repo from a
machine that can push to it:

```bash
# from a clone of gift-well, with the branch checked out:
git fetch origin claude/great-knuth-RfMLo
git checkout claude/great-knuth-RfMLo

git remote add giftwall https://github.com/brandonlines/giftwall.git  # first time only
git push giftwall claude/great-knuth-RfMLo:main
```

Already mirrored once? Just pull the latest and push again to redeploy:

```bash
git pull origin claude/great-knuth-RfMLo
git push giftwall claude/great-knuth-RfMLo:main
```

Pushing to `main` triggers the deploy workflow automatically.

## 1. DNS — point the domain at GitHub Pages

GitHub's "DNS check unsuccessful / InvalidCNAMEError" means the domain isn't
pointing at Pages yet. At your DNS host for **gift-well.ca**:

**Required — the `www` subdomain (your configured custom domain):**

| Type  | Name / Host | Value / Target           |
|-------|-------------|--------------------------|
| CNAME | `www`       | `brandonlines.github.io.` |

Remove any existing `www` record (A or old CNAME) that conflicts — there can be
only one `www` CNAME.

**Recommended — make the bare `gift-well.ca` work too** (GitHub then redirects
apex → www). Add four `A` records and four `AAAA` records on the apex `@`:

```
A    @  185.199.108.153
A    @  185.199.109.153
A    @  185.199.110.153
A    @  185.199.111.153
AAAA @  2606:50c0:8000::153
AAAA @  2606:50c0:8001::153
AAAA @  2606:50c0:8002::153
AAAA @  2606:50c0:8003::153
```

Then in **Settings → Pages**, click **Check again**. DNS can take minutes to an
hour to propagate. Once it validates, GitHub provisions a TLS certificate
(another few minutes) — then tick **Enforce HTTPS**.

## 2. Enable GitHub Pages (if not already)

The workflow tries to enable Pages for you (`configure-pages` with
`enablement: true`). If the first run errored, set it manually: **Settings →
Pages → Build and deployment → Source: GitHub Actions**, then re-run the
workflow (Actions tab → *Deploy web to GitHub Pages* → Run workflow).

## 3. Supabase credentials

The workflow already ships the project's **public, RLS-protected** values
(`https://dpbvpvrexnjgkspmbcjc.supabase.co` + the `sb_publishable_…` key), so the
build connects out of the box. To override without editing the workflow, add repo
**Actions variables** (Settings → Secrets and variables → Actions → Variables)
named `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

> These are meant to be public — Row-Level Security, not key secrecy, protects
> data. Never put the `service_role` / secret key in the web build.

## 4. Allow the web origin in Supabase Auth

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://www.gift-well.ca`
- **Redirect URLs** — add:
  - `https://www.gift-well.ca`
  - `https://www.gift-well.ca/**`

Without these, Google sign-in and email magic links return an "invalid redirect"
error on the web.

## 5. Google OAuth (for the web "Continue with Google" button)

Google Cloud Console → **APIs & Services → Credentials → your OAuth 2.0 Client**:

- **Authorized JavaScript origins:** `https://www.gift-well.ca`
  (add `https://gift-well.ca` too if you set up the apex records)
- **Authorized redirect URIs:** `https://dpbvpvrexnjgkspmbcjc.supabase.co/auth/v1/callback`
  (Supabase's callback — it completes the exchange, then returns the user to the app)

Then make sure Google is enabled in Supabase → Authentication → Providers with
the same client ID/secret.

## 6. App Store / Play Store URLs

Static pages are published alongside the app:

- Privacy: `https://www.gift-well.ca/privacy.html`
- Terms: `https://www.gift-well.ca/terms.html`
- Support: `https://www.gift-well.ca/support.html`

---

## Verifying a deploy

Actions tab → **Deploy web to GitHub Pages** → confirm both `build` and `deploy`
jobs are green, then open https://www.gift-well.ca. Hard-refresh a deep link
(e.g. `/sign-in`) to confirm the SPA 404 fallback works, and check the browser
console is free of 404s on `/_expo/...` assets.
