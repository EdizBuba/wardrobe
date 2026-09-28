import { z } from "zod";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
export const locationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z
    .enum(["HOME", "PARENTS_HOME", "TRAVEL", "STORAGE", "OTHER"])
    .default("OTHER"),
  isDefault: z.boolean().default(false),
});
export function listLocations(userId: string) {
  return db.wardrobeLocation.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}
export async function saveLocation(
  userId: string,
  input: z.infer<typeof locationSchema>,
  id?: string,
) {
  return db.$transaction(async (tx) => {
    // Serialize per-user context/default changes, including concurrent first locations.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (
      id &&
      !(await tx.wardrobeLocation.findFirst({
        where: { id, userId, archivedAt: null },
      }))
    )
      notFound("LOCATION");
    const count = await tx.wardrobeLocation.count({
      where: { userId, archivedAt: null },
    });
    const makeDefault = input.isDefault || count === 0;
    if (makeDefault)
      await tx.wardrobeLocation.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    const data = {
      ...input,
      isDefault:
        makeDefault ||
        (id
          ? (await tx.wardrobeLocation.findUnique({ where: { id } }))!.isDefault
          : false),
    };
    const location = id
      ? await tx.wardrobeLocation.update({
          where: { id_userId: { id, userId } },
          data,
        })
      : await tx.wardrobeLocation.create({ data: { ...data, userId } });
    if (location.isDefault)
      await tx.userPreference.upsert({
        where: { userId },
        create: { userId, defaultLocationId: location.id },
        update: { defaultLocationId: location.id },
      });
    return location;
  });
}
export async function archiveLocation(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const location = await tx.wardrobeLocation.findFirst({
      where: { id, userId, archivedAt: null },
    });
    if (!location) notFound("LOCATION");
    await tx.wardrobeLocation.update({
      where: { id_userId: { id, userId } },
      data: { archivedAt: new Date(), isDefault: false },
    });
    if (location.isDefault) {
      const next = await tx.wardrobeLocation.findFirst({
        where: { userId, archivedAt: null },
        orderBy: { createdAt: "asc" },
      });
      if (next)
        await tx.wardrobeLocation.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      await tx.userPreference.upsert({
        where: { userId },
        create: { userId, defaultLocationId: next?.id },
        update: { defaultLocationId: next?.id ?? null },
      });
    }
  });
}
