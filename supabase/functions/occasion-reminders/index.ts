// Edge Function: occasion-reminders
// A once-a-day scheduled job. Finds wishlists whose occasion lands 7/3/1/0 days
// out (rolling yearly-recurring dates forward to their next anniversary) and
// pushes a reminder to each group's members EXCEPT the list owner — the givers —
// who haven't turned off the `occasion_reminder` preference. It also turns each
// member's profile birthday into an automatic occasion, reminding their shared
// groups (everyone but the birthday person) on the same 7/3/1/0-day schedule.
//
// The date logic mirrors reminderDueDays() in src/lib/dates.ts, which is
// unit-tested. Because thresholds are exact day counts and this runs daily, each
// occasion fires at most four reminders and never twice in a day.
//
// Auth: shares WEBHOOK_SECRET with send-push (verify_jwt = false). Fails CLOSED.
//
// Schedule (pick one), POSTing with the x-webhook-secret header once a day:
//   • Supabase Scheduled Functions (dashboard), or
//   • pg_cron + pg_net:
//       select cron.schedule('occasion-reminders','0 14 * * *', $$
//         select net.http_post(
//           url    => 'https://<ref>.supabase.co/functions/v1/occasion-reminders',
//           headers=> jsonb_build_object('x-webhook-secret', '<secret>')
//         ); $$);
//
// Deploy:  npx supabase functions deploy occasion-reminders

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";
const THRESHOLDS = [0, 1, 3, 7];

// Constant-time compare (sole auth gate; mirrors send-push).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Mirrors reminderDueDays() in src/lib/dates.ts — UTC-midnight day count to the
// next occurrence; null unless it's exactly a reminder threshold.
function reminderDueDays(dateStr: string, recurs: boolean, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let when = recurs ? Date.UTC(now.getUTCFullYear(), m - 1, d) : Date.UTC(y, m - 1, d);
  if (recurs && when < today) when = Date.UTC(now.getUTCFullYear() + 1, m - 1, d);
  const days = Math.round((when - today) / 86_400_000);
  return THRESHOLDS.includes(days) ? days : null;
}

function reminderBody(days: number, title: string): string {
  if (days === 0) return `${title} is today! 🎁`;
  if (days === 1) return `${title} is tomorrow 🎁`;
  return `${days} days until ${title} 🎁`;
}

function birthdayBody(days: number, name: string): string {
  if (days === 0) return `${name}'s birthday is today! 🎂`;
  if (days === 1) return `${name}'s birthday is tomorrow 🎂`;
  return `${days} days until ${name}'s birthday 🎂`;
}

type PushMessage = { to: string; sound: string; title: string; body: string; data: unknown };

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) {
    return new Response("server misconfigured: WEBHOOK_SECRET is not set", { status: 500 });
  }
  if (!safeEqual(req.headers.get("x-webhook-secret") ?? "", secret)) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const { data: lists } = await admin
    .from("wishlists")
    .select("id, group_id, owner_id, title, event_date, recurs_yearly")
    .not("event_date", "is", null);

  const due = (lists ?? [])
    .map((l) => ({ l, days: reminderDueDays(l.event_date as string, l.recurs_yearly, now) }))
    .filter((x): x is { l: typeof x.l; days: number } => x.days !== null);

  const messages: PushMessage[] = [];
  for (const { l, days } of due) {
    // Givers = group members except the recipient (list owner).
    const { data: members } = await admin
      .from("memberships")
      .select("user_id")
      .eq("group_id", l.group_id)
      .neq("user_id", l.owner_id);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length === 0) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, occasion_reminder")
      .in("user_id", ids);
    const optedOut = new Set(
      (prefs ?? []).filter((p) => p.occasion_reminder === false).map((p) => p.user_id),
    );
    const notifyIds = ids.filter((id) => !optedOut.has(id));
    if (notifyIds.length === 0) continue;

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token")
      .in("user_id", notifyIds);
    for (const t of tokens ?? []) {
      messages.push({
        to: t.token,
        sound: "default",
        title: "Gift reminder",
        body: reminderBody(days, l.title),
        data: { listId: l.id },
      });
    }
  }

  // --- birthdays → automatic occasions -------------------------------------
  // A member's birthday reminds the rest of each shared group (the givers) as it
  // approaches — never the birthday person themselves. Birthdays always recur
  // yearly, so we roll forward to the next anniversary like any occasion.
  const { data: birthdayProfiles } = await admin
    .from("profiles")
    .select("id, display_name, birthday")
    .not("birthday", "is", null);

  const dueBirthdays = (birthdayProfiles ?? [])
    .map((p) => ({ p, days: reminderDueDays(p.birthday as string, true, now) }))
    .filter((x): x is { p: typeof x.p; days: number } => x.days !== null);

  for (const { p, days } of dueBirthdays) {
    // The groups the birthday person belongs to…
    const { data: theirGroups } = await admin
      .from("memberships")
      .select("group_id")
      .eq("user_id", p.id);
    const groupIds = (theirGroups ?? []).map((g) => g.group_id);
    if (groupIds.length === 0) continue;

    // …and their co-members across those groups (the givers), deduped, minus
    // the birthday person. A shared-group check keeps it from leaking to
    // strangers who happen to have set a birthday.
    const { data: coMembers } = await admin
      .from("memberships")
      .select("user_id")
      .in("group_id", groupIds)
      .neq("user_id", p.id);
    const ids = [...new Set((coMembers ?? []).map((m) => m.user_id))];
    if (ids.length === 0) continue;

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, occasion_reminder")
      .in("user_id", ids);
    const optedOut = new Set(
      (prefs ?? []).filter((pr) => pr.occasion_reminder === false).map((pr) => pr.user_id),
    );
    const notifyIds = ids.filter((id) => !optedOut.has(id));
    if (notifyIds.length === 0) continue;

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("token")
      .in("user_id", notifyIds);
    const name = p.display_name ?? "A group member";
    for (const t of tokens ?? []) {
      messages.push({
        to: t.token,
        sound: "default",
        title: "Birthday coming up",
        body: birthdayBody(days, name),
        data: { birthdayUserId: p.id },
      });
    }
  }

  // Expo accepts up to 100 messages per request; chunk and prune dead tokens.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const pushRes = await fetch(EXPO_PUSH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    sent += chunk.length;
    try {
      const body = await pushRes.json();
      const tickets = Array.isArray(body?.data) ? body.data : [];
      const dead = chunk
        .map((m, j) => (tickets[j]?.details?.error === "DeviceNotRegistered" ? m.to : null))
        .filter((t): t is string => t !== null);
      if (dead.length > 0) await admin.from("push_tokens").delete().in("token", dead);
    } catch {
      // best-effort pruning
    }
  }

  return new Response(
    JSON.stringify({ occasions: due.length, birthdays: dueBirthdays.length, sent }),
    { headers: { "Content-Type": "application/json" } },
  );
});
