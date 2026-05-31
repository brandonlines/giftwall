import { EVENT_TYPES, eventTypeMeta } from "../event-types";

describe("eventTypeMeta", () => {
  it("returns the matching preset", () => {
    expect(eventTypeMeta("secret_santa").label).toBe("Secret Santa");
    expect(eventTypeMeta("secret_santa").emoji).toBe("🤫");
    expect(eventTypeMeta("christmas").emoji).toBe("🎄");
  });
  it("falls back to General for unknown/empty values", () => {
    expect(eventTypeMeta("nope").value).toBe("general");
    expect(eventTypeMeta("").value).toBe("general");
  });
  it("has the full palette of 5", () => {
    expect(EVENT_TYPES).toHaveLength(5);
    expect(EVENT_TYPES.map((e) => e.value)).toEqual([
      "general",
      "christmas",
      "secret_santa",
      "birthday",
      "gift_shower",
    ]);
  });
});
