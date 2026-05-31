/* eslint-disable import/first -- jest.mock is hoisted above imports by babel-jest */
jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        delete store[k];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueue, pending, flush, isOfflineError } from "../queue";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("offline queue", () => {
  it("enqueues and reads back in order", async () => {
    await enqueue({ kind: "claim.create", itemId: "i1", clientId: "c1" });
    await enqueue({ kind: "comment.create", itemId: "i2", body: "hi" });
    const q = await pending();
    expect(q).toHaveLength(2);
    expect(q[0].kind).toBe("claim.create");
    expect(q[1].kind).toBe("comment.create");
  });

  it("flush runs handlers and drains on success", async () => {
    await enqueue({ kind: "comment.create", itemId: "i2", body: "hi" });
    const handler = jest.fn().mockResolvedValue(undefined);
    await flush({
      "claim.create": handler,
      "claim.release": handler,
      "comment.create": handler,
      "item.create": handler,
      "contribution.chipIn": handler,
      "contribution.remove": handler,
      "reaction.add": handler,
      "reaction.remove": handler,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(await pending()).toHaveLength(0);
  });

  it("stops at the first failure and preserves the queue (ordering)", async () => {
    await enqueue({ kind: "claim.create", itemId: "a", clientId: "a" });
    await enqueue({ kind: "claim.release", itemId: "b", clientId: "b" });
    const failing = jest.fn().mockRejectedValue(new Error("offline"));
    const ok = jest.fn().mockResolvedValue(undefined);
    await flush({
      "claim.create": failing,
      "claim.release": ok,
      "comment.create": ok,
      "item.create": ok,
      "contribution.chipIn": ok,
      "contribution.remove": ok,
      "reaction.add": ok,
      "reaction.remove": ok,
    });
    expect(ok).not.toHaveBeenCalled(); // never reached the second item
    expect(await pending()).toHaveLength(2); // nothing drained
  });

  it("queues and replays contributions and reactions in order", async () => {
    await enqueue({ kind: "contribution.chipIn", itemId: "i1", amountCents: 500 });
    await enqueue({ kind: "reaction.add", itemId: "i1", emoji: "❤️" });
    await enqueue({ kind: "reaction.remove", itemId: "i1", emoji: "❤️" });
    const seen: string[] = [];
    const rec = (k: string) => async () => {
      seen.push(k);
    };
    await flush({
      "claim.create": rec("claim.create"),
      "claim.release": rec("claim.release"),
      "comment.create": rec("comment.create"),
      "item.create": rec("item.create"),
      "contribution.chipIn": rec("contribution.chipIn"),
      "contribution.remove": rec("contribution.remove"),
      "reaction.add": rec("reaction.add"),
      "reaction.remove": rec("reaction.remove"),
    });
    expect(seen).toEqual(["contribution.chipIn", "reaction.add", "reaction.remove"]);
    expect(await pending()).toHaveLength(0);
  });
});

describe("isOfflineError", () => {
  it("is true for network-ish errors", () => {
    expect(isOfflineError(new Error("Network request failed"))).toBe(true);
    expect(isOfflineError(new Error("Failed to fetch"))).toBe(true);
  });
  it("is false for real rejections", () => {
    expect(isOfflineError(new Error("permission denied for table claims"))).toBe(false);
  });
});
