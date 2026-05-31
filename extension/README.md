# giftwall browser extension

A tiny Manifest V3 extension: while you're on any product page, click the
giftwall toolbar button to capture the item (title, image, price, URL) and add
it to your wishlist.

## How it works

The popup reads the page's OpenGraph / price metadata (`popup.js` → `scrapePage`)
and opens `https://www.gift-well.ca/add?url=…&title=…&image=…&price=…`. The
extension never holds a token — your signed-in **web** session on gift-well.ca
performs the write. That keeps the security surface tiny.

## Load it (development)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Toggle **Developer mode** on.
3. **Load unpacked** → select this `extension/` folder.
4. Pin "giftwall — Add to wishlist" and click it on any product page.

Firefox: `about:debugging` → **This Firefox** → **Load Temporary Add-on** →
pick `manifest.json`.

## Remaining wiring (one step)

The handoff target `gift-well.ca/add` is the **web** add route. It pairs with
hosting the Expo web build at gift-well.ca and adding an `/add` screen that reads
the query params, lets you pick a list, and saves the item. Until that page is
live, the button opens the URL but the landing page must exist to complete the
save. (Everything else — capture, metadata scrape, handoff — is done.)

## Publishing

- Chrome Web Store / Edge Add-ons: zip this folder, add 128px icons to the
  manifest (`"icons"`), and submit. Icons are intentionally omitted here to keep
  the repo binary-free.
