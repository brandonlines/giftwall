/* giftwall browser extension — popup.
 *
 * Reads the active tab's product metadata (OpenGraph / common price meta) and
 * hands off to the giftwall web add flow with the fields prefilled. The handoff
 * keeps the extension itself authentication-free: the signed-in web session on
 * gift-well.ca owns the actual write, so no token ever lives in the extension.
 */

const ADD_BASE = "https://www.gift-well.ca/add";

// Runs in the page context to scrape metadata. Must be self-contained (no outer
// scope) because chrome.scripting serializes it.
function scrapePage() {
  const og = (p) => document.querySelector(`meta[property="${p}"]`)?.content || "";
  const named = (n) => document.querySelector(`meta[name="${n}"]`)?.content || "";
  return {
    title: og("og:title") || document.title || "",
    image: og("og:image") || og("og:image:url") || "",
    price: og("product:price:amount") || named("twitter:data1") || "",
    url: og("og:url") || location.href,
  };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function render(meta) {
  setText("title", meta.title || "Untitled item");
  setText("price", meta.price ? `~${meta.price}` : "");
  const thumb = document.getElementById("thumb");
  if (meta.image) thumb.src = meta.image;
  else thumb.style.display = "none";

  const btn = document.getElementById("add");
  btn.disabled = false;
  btn.addEventListener("click", () => {
    const q = new URLSearchParams();
    if (meta.url) q.set("url", meta.url);
    if (meta.title) q.set("title", meta.title);
    if (meta.image) q.set("image", meta.image);
    if (meta.price) q.set("price", meta.price);
    chrome.tabs.create({ url: `${ADD_BASE}?${q.toString()}` });
    window.close();
  });
}

async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let meta = { title: tab?.title || "", url: tab?.url || "", image: "", price: "" };
  if (tab?.id) {
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapePage,
      });
      if (res?.result) meta = { ...meta, ...res.result };
    } catch {
      // Some pages (chrome://, store pages) block injection — fall back to title/url.
    }
  }
  render(meta);
}

main();
