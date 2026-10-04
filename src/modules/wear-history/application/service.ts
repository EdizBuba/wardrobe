import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { idSchema } from "@/modules/wardrobe/domain/schemas";
import { calendarDate, dateToDb } from "@/modules/planner/domain/calendar";
export const wearSchema = z.object({
  outfitVariantId: idSchema,
  wornDate: calendarDate,
  sourcePlanId: idSchema.optional(),
  note: z.string().max(2000).nullable().optional(),
});
export async function markWorn(
  userId: string,
  input: z.infer<typeof wearSchema>,
) {
  return db.$transaction(async (tx) => {
    if (input.sourcePlanId) {
      await tx.$queryRaw`SELECT id FROM "OutfitPlan" WHERE id = ${input.sourcePlanId} AND "userId" = ${userId} FOR UPDATE`;
      const plan = await tx.outfitPlan.findFirst({
        where: { id: input.sourcePlanId, userId },
      });
      if (!plan) notFound("PLAN");
      if (plan.outfitVariantId !== input.outfitVariantId)
        throw new AppError(
          "PLAN_VARIANT_MISMATCH",
          "La variante ne correspond pas au plan.",
        );
      const existing = await tx.wearLog.findFirst({
        where: { sourcePlanId: plan.id, userId },
      });
      if (existing) return existing;
    }
    const variant = await tx.outfitVariant.findFirst({
      where: { id: input.outfitVariantId, userId },
      include: { outfit: true, items: { include: { item: true } } },
    });
    if (!variant) notFound("VARIANT");
    const log = await tx.wearLog.create({
      data: {
        ...input,
        userId,
        wornDate: dateToDb(input.wornDate),
        outfitName: variant.outfit.name,
        variantName: variant.name,
      },
    });
    await tx.wearLogItem.createMany({
      data: variant.items.map((i) => ({
        userId,
        wearLogId: log.id,
        wardrobeItemId: i.wardrobeItemId,
        itemName: i.item.name,
      })),
    });
    return log;
  });
}
export function listHistory(userId: string, page = 1) {
  return db.wearLog.findMany({
    where: { userId },
    include: { items: true },
    orderBy: [{ wornDate: "desc" }, { createdAt: "desc" }],
    take: 48,
    skip: (page - 1) * 48,
  });
}
