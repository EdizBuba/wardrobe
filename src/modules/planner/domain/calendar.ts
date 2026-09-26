import { z } from "zod";
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00.000Z");
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Date invalide");
export function dateToDb(value: string) {
  return new Date(calendarDate.parse(value) + "T00:00:00.000Z");
}
export function dateInTimezone(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function planConflicts(
  plans: { id: string; plannedDate: string; slot: string; itemIds: string[] }[],
) {
  return plans.flatMap((plan, index) =>
    plans.slice(index + 1).flatMap((other) => {
      const overlaps =
        plan.plannedDate === other.plannedDate &&
        (plan.slot === "ALL_DAY" ||
          other.slot === "ALL_DAY" ||
          plan.slot === other.slot);
      const sharedItemIds = overlaps
        ? plan.itemIds.filter((id) => other.itemIds.includes(id))
        : [];
      return sharedItemIds.length
        ? [{ planIds: [plan.id, other.id], sharedItemIds }]
        : [];
    }),
  );
}
