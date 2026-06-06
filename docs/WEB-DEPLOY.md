# Deploying the giftwall web app to GitHub Pages

The same Expo codebase ships as a public web app. `.github/workflows/deploy-web.yml`
runs `expo export --platform web` and publishes the static `dist/` bundle to
GitHub Pages on every push to `main`.

- **Live URL:** https://brandonlines.github.io/giftwall
- **Custom domain:** `gift-well.ca` redirects to the URL above (see step 5).
- **Auth on web:** Email one-time code + Google. **Sign in with Apple is
  native-iOS only** and is hidden in the browser by design.
- **Native-only features** (barcode scan, push notifications, share-to-app)
  degrade gracefully to a "use the app" state on the web.

> Why `baseUrl: "/giftwall"`? GitHub project pages serve under
> `https://<user>.github.io/<repo>/`, so `app.json` sets
> `experiments.baseUrl` to `/giftwall` so assets and routes resolve. If you ever
> move to a bare custom domain (apex/root), change it back to `/`.

---

## 0. Get this code into the public `giftwall` repo

These changes live on the `gift-well` repo's branch
`claude/great-knuth-RfMLo`. Mirror them into the public `giftwall` repo from a
machine that can push to it:

```bash
# from a clone of gift-well, with the branch checked out:
git fetch origin claude/great-knuth-RfMLo
git checkout claude/great-knuth-RfMLo

git remote add giftwall https://github.com/brandonlines/giftwall.git
git push giftwall claude/great-knuth-RfMLo:main
```

Prefer a clean, single-commit public history (no private gift-well history)?
Use an orphan commit instead of the last `git push`:

```bash
git checkout --orphan public-main
git commit -m "giftwall: initial public web release"
git push giftwall public-main:main
```

Pushing to `main` triggers the deploy workflow automatically.

## 1. Enable GitHub Pages

The workflow tries to enable Pages for you (`configure-pages` with
`enablement: true`). If the first run errors on Pages not being enabled, set it
manually: **Settings → Pages → Build and deployment → Source: GitHub Actions**,
then re-run the workflow (Actions tab → *Deploy web to GitHub Pages* → Run
workflow).

## 2. Supabase credentials

The workflow already ships the project's **public, RLS-protected** values
(`https://dpbvpvrexnjgkspmbcjc.supabase.co` + the `sb_publishable_…` key), so the
first deploy connects out of the box. To override without editing the workflow,
add repo **Actions variables** (Settings → Secrets and variables → Actions →
Variables) named `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

> These are meant to be public — Row-Level Security, not key secrecy, protects
> data. Never put the `service_role` / secret key in the web build.

## 3. Allow the web origin in Supabase Auth

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://brandonlines.github.io/giftwall`
- **Redirect URLs** — add:
  - `https://brandonlines.github.io/giftwall`
  - `https://brandonlines.github.io/giftwall/**`
  - `https://gift-well.ca/**` (if you use the custom-domain redirect)

Without these, Google sign-in and email magic links return an "invalid redirect"
error on the web.

## 4. Google OAuth (for the web "Continue with Google" button)

Google Cloud Console → **APIs & Services → Credentials → your OAuth 2.0 Client**:

- **Authorized JavaScript origins:** `https://brandonlines.github.io`
- **Authorized redirect URIs:** `https://dpbvpvrexnjgkspmbcjc.supabase.co/auth/v1/callback`
  (this is Supabase's callback — it's what completes the exchange, then returns
  the user to the app).

Then make sure Google is enabled in Supabase → Authentication → Providers with
the same client ID/secret.

## 5. Redirect `gift-well.ca` → the Pages site

You own `gift-well.ca` and want it to land on the project page. Pick one:

- **Registrar / DNS provider redirect** (simplest): add a URL/forwarding rule
  `gift-well.ca` → `https://brandonlines.github.io/giftwall`.
- **Cloudflare** (path-preserving, recommended for the App Store URLs below):
  a Redirect Rule from `gift-well.ca/*` to
  `https://brandonlines.github.io/giftwall/$1` keeps `/privacy` → `/privacy.html`
  working.

> Note: this is a *redirect*, not a Pages custom domain. We are **not** adding a
> `CNAME` file, so `baseUrl` stays `/giftwall`.

## 6. App Store / Play Store URLs

Static pages are published alongside the app:

- Privacy: `https://brandonlines.github.io/giftwall/privacy.html`
- Terms: `https://brandonlines.github.io/giftwall/terms.html`
- Support: `https://brandonlines.github.io/giftwall/support.html`

Use these directly, or the `gift-well.ca/privacy` style URLs if you set up the
path-preserving redirect in step 5.

---

## Verifying a deploy

Actions tab → **Deploy web to GitHub Pages** → confirm both `build` and `deploy`
jobs are green, then open the live URL. Hard-refresh a deep link (e.g.
`/giftwall/sign-in`) to confirm the SPA 404 fallback works.
