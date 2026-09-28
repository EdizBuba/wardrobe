import { z } from "zod";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { itemSchema, itemFilterSchema } from "../domain/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { dateToDb } from "@/modules/planner/domain/calendar";
export async function listItems(
  userId: string,
  page = 1,
  locationId?: string,
  filters: z.infer<typeof itemFilterSchema> = {},
) {
  const where: Prisma.WardrobeItemWhereInput = {
    userId,
    archivedAt: null,
    ...(locationId ? { locationId } : {}),
    ...(filters.search
      ? { name: { contains: filters.search, mode: "insensitive" } }
      : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const [items, total] = await Promise.all([
    db.wardrobeItem.findMany({
      where,
      include: { images: { orderBy: { createdAt: "desc" } }, location: true },
      orderBy: { createdAt: "desc" },
      take: 48,
      skip: (page - 1) * 48,
    }),
    db.wardrobeItem.count({ where }),
  ]);
  return { items, total, page, pageSize: 48 };
}
export async function getItem(userId: string, id: string) {
  const item = await db.wardrobeItem.findFirst({
    where: { id, userId },
    include: {
      images: { orderBy: { createdAt: "desc" } },
      location: true,
      wearItems: {
        include: { wearLog: true },
        orderBy: { wearLog: { wornDate: "desc" } },
        take: 5,
      },
    },
  });
  if (!item) notFound("WARDROBE_ITEM");
  return item;
}
export async function saveItem(
  userId: string,
  input: z.infer<typeof itemSchema>,
  id?: string,
) {
  const data = {
    ...input,
    purchaseDate: input.purchaseDate ? dateToDb(input.purchaseDate) : null,
  };
  return db.$transaction(async (tx) => {
    if (
      !(await tx.wardrobeLocation.findFirst({
        where: { id: input.locationId, userId, archivedAt: null },
      }))
    )
      notFound("LOCATION");
    if (
      id &&
      !(await tx.wardrobeItem.findFirst({
        where: { id, userId, archivedAt: null },
      }))
    )
      notFound("WARDROBE_ITEM");
    return id
      ? tx.wardrobeItem.update({ where: { id_userId: { id, userId } }, data })
      : tx.wardrobeItem.create({ data: { ...data, userId } });
  });
}
export async function archiveItem(userId: string, id: string) {
  const result = await db.wardrobeItem.updateMany({
    where: { id, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (!result.count) notFound("WARDROBE_ITEM");
}
