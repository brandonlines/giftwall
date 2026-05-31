import AsyncStorage from "@react-native-async-storage/async-storage";

// A minimal offline mutation queue. When a write fails because the device is
// offline, the repository enqueues the intent here; flush() replays it once
// connectivity returns. This is a deliberately small stub — for production,
// graduate to PowerSync / WatermelonDB / TanStack Query persistence, which
// handle conflict resolution and local-first reads as well as writes.

const KEY = "giftwall.offlineQueue.v1";

export type OfflineItemFields = {
  title: string;
  url?: string | null;
  image_url?: string | null;
  photos?: string[];
  price_cents?: number | null;
  currency?: string | null;
  note?: string | null;
  quantity?: number;
  is_priority?: boolean;
  is_group_gift?: boolean;
};

export type QueuedMutation =
  | { kind: "claim.create"; itemId: string; clientId: string }
  | { kind: "claim.release"; itemId: string; clientId: string }
  | { kind: "comment.create"; itemId: string; body: string }
  | { kind: "item.create"; listId: string; fields: OfflineItemFields }
  | { kind: "contribution.chipIn"; itemId: string; amountCents: number }
  | { kind: "contribution.remove"; itemId: string }
  | { kind: "reaction.add"; itemId: string; emoji: string }
  | { kind: "reaction.remove"; itemId: string; emoji: string };

// True when a write failed because the device is offline (vs. a real rejection
// like an RLS denial), so the repository can queue it instead of surfacing it.
export function isOfflineError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? "";
  return /network|fetch|offline|timeout|Failed to fetch/i.test(msg);
}

type Handlers = {
  [K in QueuedMutation["kind"]]: (
    m: Extract<QueuedMutation, { kind: K }>,
  ) => Promise<void>;
};

async function read(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
}

async function write(items: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueue(m: QueuedMutation): Promise<void> {
  const q = await read();
  q.push(m);
  await write(q);
}

export async function pending(): Promise<QueuedMutation[]> {
  return read();
}

// Replays queued mutations in order. A mutation that succeeds (or is no longer
// applicable) is dropped; the first hard failure stops the flush so ordering is
// preserved and we retry on the next connectivity event.
export async function flush(handlers: Handlers): Promise<void> {
  let q = await read();
  while (q.length > 0) {
    const next = q[0];
    try {
      await handlers[next.kind](next as never);
      q = q.slice(1);
      await write(q);
    } catch {
      break;
    }
  }
}
