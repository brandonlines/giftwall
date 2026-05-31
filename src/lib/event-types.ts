import type { EventType } from "../types/database";

export type EventMeta = { value: EventType; label: string; emoji: string; blurb: string };

// The presets shown when creating a group. `general` is the default/fallback.
export const EVENT_TYPES: EventMeta[] = [
  { value: "general", label: "General", emoji: "🎁", blurb: "Shared wishlists for any occasion." },
  { value: "christmas", label: "Christmas", emoji: "🎄", blurb: "Everyone's lists — claim and chip in together." },
  { value: "secret_santa", label: "Secret Santa", emoji: "🤫", blurb: "Draw names; each person secretly buys for one other." },
  { value: "birthday", label: "Birthday", emoji: "🎂", blurb: "One star of the show — everyone buys for them." },
  { value: "gift_shower", label: "Gift shower", emoji: "👶", blurb: "Baby or wedding registry — claim items, no duplicates." },
];

export function eventTypeMeta(value: string): EventMeta {
  return EVENT_TYPES.find((e) => e.value === value) ?? EVENT_TYPES[0];
}
