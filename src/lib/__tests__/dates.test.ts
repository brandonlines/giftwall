import { isValidDateStr, daysUntil, formatCountdown } from "../dates";

const NOW = Date.UTC(2026, 4, 29); // 2026-05-29 UTC midnight

describe("isValidDateStr", () => {
  it("accepts real YYYY-MM-DD dates", () => {
    expect(isValidDateStr("2026-12-25")).toBe(true);
  });
  it("rejects bad formats and impossible dates", () => {
    expect(isValidDateStr("2026-13-01")).toBe(false);
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("2026-1-1")).toBe(false);
    expect(isValidDateStr("not a date")).toBe(false);
    expect(isValidDateStr("")).toBe(false);
  });
});

describe("daysUntil", () => {
  it("is 0 today, 1 tomorrow, -1 yesterday", () => {
    expect(daysUntil("2026-05-29", NOW)).toBe(0);
    expect(daysUntil("2026-05-30", NOW)).toBe(1);
    expect(daysUntil("2026-05-28", NOW)).toBe(-1);
  });
  it("counts multiple days", () => {
    expect(daysUntil("2026-06-10", NOW)).toBe(12);
  });
  it("is NaN for invalid input", () => {
    expect(Number.isNaN(daysUntil("bad", NOW))).toBe(true);
  });
});

describe("formatCountdown", () => {
  it("formats relative phrases", () => {
    expect(formatCountdown("2026-05-29", NOW)).toBe("Today!");
    expect(formatCountdown("2026-05-30", NOW)).toBe("Tomorrow");
    expect(formatCountdown("2026-06-10", NOW)).toBe("in 12 days");
    expect(formatCountdown("2026-05-28", NOW)).toBe("Yesterday");
    expect(formatCountdown("2026-05-24", NOW)).toBe("5 days ago");
  });
  it("returns null for invalid input", () => {
    expect(formatCountdown("nope", NOW)).toBeNull();
  });
});
