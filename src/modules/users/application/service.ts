import { z } from "zod";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { idSchema } from "@/modules/wardrobe/domain/schemas";
export const preferenceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  timezone: z.string().refine((s) => {
    try {
      new Intl.DateTimeFormat("fr", { timeZone: s });
      return true;
    } catch {
      return false;
    }
  }),
  theme: z.enum(["light", "dark", "system"]),
  defaultLocationId: idSchema.nullable().optional(),
});
export async function getPreferences(userId: string) {
  return (
    (await db.userPreference.findUnique({ where: { userId } })) ?? {
      userId,
      timezone: "Europe/Paris",
      theme: "system" as const,
      defaultLocationId: null,
    }
  );
}
export async function savePreferences(
  userId: string,
  input: z.infer<typeof preferenceSchema>,
) {
  const { name, ...data } = input;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if (
      input.defaultLocationId &&
      !(await tx.wardrobeLocation.findFirst({
        where: { id: input.defaultLocationId, userId, archivedAt: null },
      }))
    )
      notFound("LOCATION");
    if (input.defaultLocationId !== undefined) {
      await tx.wardrobeLocation.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      if (input.defaultLocationId)
        await tx.wardrobeLocation.update({
          where: { id_userId: { id: input.defaultLocationId, userId } },
          data: { isDefault: true },
        });
    }
    await tx.user.update({ where: { id: userId }, data: { name } });
    return tx.userPreference.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });
  });
}
