# Hosting the privacy policy

The App Store **requires** a public Privacy Policy URL. `privacy.html` here is a
clean, self-contained page (no dependencies) you can host anywhere. Pick one:

### Easiest — Netlify Drop (no account, ~1 min)
1. Go to **app.netlify.com/drop**.
2. Drag the whole **`docs/`** folder onto the page.
3. It gives you an instant public URL like `https://giftwall-legal.netlify.app/privacy.html`.
4. Paste that into App Store Connect → App Privacy → Privacy Policy URL, and into
   `app.json` if you add a policy link there.

### In your GitHub ecosystem — GitHub Pages (needs a *public* repo)
Your app repo is private, and Pages on a private repo needs a paid plan. Cleanest
free route: make a small **public** repo (e.g. `giftwall-legal`), drop these files
in, then **Settings → Pages → Deploy from branch → main /(root)**. URL:
`https://<you>.github.io/giftwall-legal/privacy.html`.

### Also fine
Cloudflare Pages, Vercel, or any static host — it's just one HTML file.

---

**Before you go public:** replace `support@giftwall.app` in `privacy.html` (and
in `src/legal/content.ts` / the in-app Legal screen) with your real support email,
and have the policy reviewed. A `terms.html` can be added the same way from
`TERMS.md` if you want a Terms link too.
