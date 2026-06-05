# giftwall — App Store Connect submission answers

Drafted from the actual code/schema (see PRIVACY.md). **Not legal advice — have it reviewed.**
Over-declaring is safe; under-declaring causes rejections. giftwall has **no analytics or
advertising SDKs**, uses **no tracking**, and sells **no data**.

---

## 1. App Privacy questionnaire

**"Do you or your third-party partners collect data from this app?" → YES.**

For each type below: Collected? · Linked to the user's identity? · Used for **Tracking**? · Purpose.
Every purpose is **App Functionality**. **Tracking = No** for everything (see §3).

| Apple data type | Collected | Linked | Tracking | What it is |
|---|---|---|---|---|
| Contact Info → **Email Address** | Yes | Yes | No | Sign-in / account |
| Contact Info → **Name** | Yes | Yes | No | Display name; Sign in with Apple may supply a name |
| Contact Info → **Physical Address** | Yes | Yes | No | *Optional* shipping address (visible to group members) |
| User Content → **Photos or Videos** | Yes | Yes | No | Avatar, item images, group cover photos |
| User Content → **Other User Content** | Yes | Yes | No | Wishlist items/notes, comments, group chat, thank-you notes, reactions, **AI-assistant inputs you type** |
| Identifiers → **User ID** | Yes | Yes | No | Account ID + Apple/Google sign-in IDs |
| Identifiers → **Device ID** | Yes | Yes | No | Expo **push-notification token** (conservative declaration; functional only) |
| Other Data → **Other Data Types** | Yes | Yes | No | *Optional* birthday (occasion reminders) |
| Diagnostics → **Crash Data** | Yes | **No** | No | Sentry crash reports — PII collection disabled |
| Diagnostics → **Performance Data** | Yes | **No** | No | Sentry performance traces (20% sample) |

**Declared NOT collected:** Precise/Coarse Location · Financial Info / Payment Info · Health & Fitness ·
Contacts · Browsing History · Search History · Purchases (Purchase History) · Usage Data (Product
Interaction / Advertising Data) · Sensitive Info · Audio Data · Gameplay Content.

- **Data Linked to You:** Email, Name, Physical Address, Photos/Videos, Other User Content, User ID, Device ID, Birthday.
- **Data Not Linked to You:** Crash Data, Performance Data.

---

## 2. Tracking / App Tracking Transparency

**No data is used for tracking → answer "No" → no ATT permission prompt needed.**
- No third-party advertising SDKs, no data brokers, no cross-app/website tracking.
- Amazon Associates affiliate tags only attribute a purchase; they do **not** share your identity or track you across apps/sites.

---

## 3. How third parties receive / process data ("third-party data collection")

All are **service providers/processors** acting for giftwall's functionality. None get data for **their own** advertising; none for tracking.

| Third party | Where | Data it receives | Why |
|---|---|---|---|
| **Supabase** | Backend host | All app data (account, profile, content, tokens) | Database, auth, file storage, realtime — operate the app |
| **Apple** (Sign in with Apple) | On-device | Name + email (you may hide email) | Authenticate you |
| **Google** (Sign in with Google) | Backend (OAuth) | Email + basic profile | Authenticate you |
| **Google** (Gemini API) | Backend | The recipient details you type into the AI assistant (relationship, interests, occasion, budget, notes) — **not** your name/email/identity; not stored by us | Generate gift ideas |
| **Expo** (Push Service + OTA) | On-device SDK | Push token; notification text (item/member names, thank-you text); update-check metadata (platform, runtime, update requests) | Deliver notifications + app updates |
| **Sentry** | On-device SDK | Crash + performance diagnostics (PII disabled) | Diagnose bugs |
| **Open Food Facts** | Backend | Scanned barcode numbers | Resolve product name/image |
| **Retailers** (Amazon etc.) | Backend + outbound links | The product URL you paste (server fetch); outbound clicks carry an Amazon affiliate tag | Link previews + affiliate attribution |

---

## 4. Other submission answers

- **Export compliance (encryption):** Standard/exempt encryption only. `ITSAppUsesNonExemptEncryption = false` is already set in the app → answer **"No"** to non-exempt encryption (no extra docs).
- **IDFA / Advertising identifier:** **Not used** → "No."
- **Content rights:** Contains user-generated content (users own it, license you to display it per the Terms) and product images fetched from retailer links. Confirm you have rights to display the content.
- **Account deletion:** Required for account-based apps — giftwall **has it** (Profile → Your data → Delete account). ✅
- **Privacy Policy URL:** must point to the updated policy hosted on gift-well.ca. **Required.**
- **Age rating:** likely **12+** given mild UGC + the AI assistant — answer the new questionnaire honestly (see §5).

---

## 5. ⚠️ Submission risk: User-Generated Content (App Review Guideline 1.2)

giftwall lets members post content others see (display names, item notes, comments, **group chat**, thank-you notes). Apple requires UGC apps to provide **all** of:
1. a method to **filter** objectionable content,
2. a way to **report** content with timely action,
3. a way to **block** abusive users,
4. a published content/abuse policy.

giftwall has (4) (Terms → Acceptable use) and admin **remove-member** + **leave-group** — but **(2) reporting and (3) blocking are CONFIRMED MISSING** (the only moderation tools in the code are admin "Remove from group" and "Leave group"; there is no Report action and no per-user Block). This is the single most likely rejection reason.

Two paths:
- **Recommended:** add a **Report** action (on comments, group messages, and items) that flags content for review within 24h, plus a **Block** that hides a blocked user's content from you. Then answer the UGC questions cleanly.
- **Riskier:** submit as-is and argue in **App Review notes** that giftwall is **invite-only, private family/friend groups** (you only ever see content from people you invited — not open/public social), so the abuse surface is minimal. Some reviewers accept this for closed-group apps; many don't. Be ready for a rejection + fast resubmit.
