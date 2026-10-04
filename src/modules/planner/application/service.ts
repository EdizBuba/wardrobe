import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { idSchema } from "@/modules/wardrobe/domain/schemas";
import { calendarDate, dateToDb, planConflicts } from "../domain/calendar";
import { variantAvailability } from "@/modules/wardrobe/domain/availability";
export const planSchema = z.object({
  outfitVariantId: idSchema,
  plannedDate: calendarDate,
  slot: z
    .enum(["ALL_DAY", "MORNING", "AFTERNOON", "EVENING"])
    .default("ALL_DAY"),
  note: z.string().max(2000).nullable().optional(),
});
export async function listPlans(
  userId: string,
  locationId: string,
  from: string,
  to: string,
) {
  const plans = await db.outfitPlan.findMany({
    where: { userId, plannedDate: { gte: dateToDb(from), lte: dateToDb(to) } },
    include: {
      wearLog: true,
      variant: {
        include: {
          outfit: true,
          items: {
            include: {
              item: {
                include: {
                  images: { orderBy: { createdAt: "desc" } },
                  location: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ plannedDate: "asc" }, { createdAt: "asc" }],
  });
  const conflicts = planConflicts(
    plans.map((p) => ({
      id: p.id,
      plannedDate: p.plannedDate.toISOString().slice(0, 10),
      slot: p.slot,
      itemIds: p.variant.items.map((i) => i.wardrobeItemId),
    })),
  );
  return {
    plans: plans.map((p) => ({
      ...p,
      availability: variantAvailability(
        p.variant.items.map((i) => i.item),
        userId,
        locationId,
      ),
      conflicts: conflicts.filter((c) => c.planIds.includes(p.id)),
    })),
    conflicts,
  };
}
export async function savePlan(
  userId: string,
  input: z.infer<typeof planSchema>,
  id?: string,
) {
  return db.$transaction(async (tx) => {
    if (
      !(await tx.outfitVariant.findFirst({
        where: {
          id: input.outfitVariantId,
          userId,
          outfit: { archivedAt: null },
        },
      }))
    )
      notFound("VARIANT");
    if (id && !(await tx.outfitPlan.findFirst({ where: { id, userId } })))
      notFound("PLAN");
    if (
      id &&
      (await tx.wearLog.findFirst({ where: { sourcePlanId: id, userId } }))
    )
      throw new AppError(
        "PLAN_ALREADY_WORN",
        "Une tenue déjà portée conserve son plan d’origine.",
        409,
      );
    const data = { ...input, plannedDate: dateToDb(input.plannedDate) };
    return id
      ? tx.outfitPlan.update({ where: { id_userId: { id, userId } }, data })
      : tx.outfitPlan.create({ data: { ...data, userId } });
  });
}
export async function removePlan(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    if (!(await tx.outfitPlan.findFirst({ where: { id, userId } })))
      notFound("PLAN");
    // Detach provenance without removing the historical snapshot.
    await tx.wearLog.updateMany({
      where: { sourcePlanId: id, userId },
      data: { sourcePlanId: null },
    });
    await tx.outfitPlan.delete({ where: { id_userId: { id, userId } } });
  });
}
