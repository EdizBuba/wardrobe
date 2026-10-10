import { it, expect } from "vitest";
import {
  calendarDate,
  dateInTimezone,
  dateToDb,
  planConflicts,
} from "@/modules/planner/domain/calendar";
it("validates actual calendar dates including leap years", () => {
  expect(calendarDate.safeParse("2024-02-29").success).toBe(true);
  for (const invalid of [
    "2025-02-29",
    "2026-04-31",
    "2026-1-02",
    "2026-13-01",
    "2026-01-01T12:00:00Z",
  ])
    expect(calendarDate.safeParse(invalid).success).toBe(false);
  expect(dateToDb("2026-10-13").toISOString()).toBe("2026-10-13T00:00:00.000Z");
});
it("derives today from the user timezone, including DST and UTC rollover", () => {
  expect(dateInTimezone("Europe/Paris", new Date("2026-10-12T23:30:00Z"))).toBe(
    "2026-10-13",
  );
  expect(
    dateInTimezone("America/Los_Angeles", new Date("2026-10-13T01:00:00Z")),
  ).toBe("2026-10-12");
});
it("warns only when item use and slots overlap", () => {
  const plans = [
    { id: "a", plannedDate: "2026-10-13", slot: "MORNING", itemIds: ["x"] },
    { id: "b", plannedDate: "2026-10-13", slot: "EVENING", itemIds: ["x"] },
  ];
  expect(planConflicts(plans)).toEqual([]);
  expect(
    planConflicts([
      ...plans,
      { id: "c", plannedDate: "2026-10-13", slot: "ALL_DAY", itemIds: ["x"] },
    ]),
  ).toHaveLength(2);
});
