import {
  isValidDateStr,
  daysUntil,
  formatCountdown,
  nextOccurrence,
  occasionCountdown,
  reminderDueDays,
} from "../dates";

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

describe("nextOccurrence", () => {
  it("leaves one-off dates unchanged", () => {
    expect(nextOccurrence("2026-05-24", false, NOW)).toBe("2026-05-24");
    expect(nextOccurrence("2020-01-01", false, NOW)).toBe("2020-01-01");
  });
  it("keeps a recurring date still ahead this year", () => {
    expect(nextOccurrence("2026-12-25", true, NOW)).toBe("2026-12-25");
  });
  it("rolls a passed recurring date to next year, ignoring the stored year", () => {
    // Birthday stored as 1990-03-10 — already passed in 2026, so next is 2027.
    expect(nextOccurrence("1990-03-10", true, NOW)).toBe("2027-03-10");
    // A date earlier this calendar year also rolls forward.
    expect(nextOccurrence("2026-05-28", true, NOW)).toBe("2027-05-28");
  });
  it("treats today as the occurrence (no roll)", () => {
    expect(nextOccurrence("2000-05-29", true, NOW)).toBe("2026-05-29");
  });
  it("returns invalid input unchanged", () => {
    expect(nextOccurrence("nope", true, NOW)).toBe("nope");
  });
});

describe("occasionCountdown", () => {
  it("counts down to the next occurrence for recurring dates", () => {
    expect(occasionCountdown("2000-05-29", true, NOW)).toBe("Today!");
    expect(occasionCountdown("1990-05-30", true, NOW)).toBe("Tomorrow");
    // A long-passed birthday reads as a future countdown, never "ago".
    expect(occasionCountdown("1985-05-24", true, NOW)).toBe("in 360 days");
  });
  it("behaves like formatCountdown for one-off dates", () => {
    expect(occasionCountdown("2026-05-24", false, NOW)).toBe("5 days ago");
  });
});

describe("reminderDueDays", () => {
  it("fires at 7/3/1/0 days out", () => {
    expect(reminderDueDays("2026-06-05", false, NOW)).toBe(7);
    expect(reminderDueDays("2026-06-01", false, NOW)).toBe(3);
    expect(reminderDueDays("2026-05-30", false, NOW)).toBe(1);
    expect(reminderDueDays("2026-05-29", false, NOW)).toBe(0);
  });
  it("is null on non-threshold and past one-off days", () => {
    expect(reminderDueDays("2026-05-31", false, NOW)).toBeNull(); // 2 days out
    expect(reminderDueDays("2026-05-20", false, NOW)).toBeNull(); // already passed
  });
  it("uses the next occurrence for recurring dates", () => {
    expect(reminderDueDays("1990-05-30", true, NOW)).toBe(1); // birthday tomorrow
    expect(reminderDueDays("1990-05-28", true, NOW)).toBeNull(); // ~next year, far off
  });
  it("is null for invalid input", () => {
    expect(reminderDueDays("nope", true, NOW)).toBeNull();
  });
});
