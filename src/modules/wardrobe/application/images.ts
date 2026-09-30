import { db } from "@/lib/db";
import { notFound, AppError } from "@/lib/errors";
import { imageStorage, normalizeImage } from "../infrastructure/image-storage";
export async function uploadImage(
  userId: string,
  itemId: string,
  bytes: Uint8Array,
) {
  if (
    !(await db.wardrobeItem.findFirst({
      where: { id: itemId, userId, archivedAt: null },
    }))
  )
    notFound("WARDROBE_ITEM");
  if ((await db.itemImage.count({ where: { userId, itemId } })) >= 5)
    throw new AppError("IMAGE_LIMIT", "Maximum 5 photos par pièce.");
  const normalized = await normalizeImage(bytes);
  const key = await imageStorage.put(normalized.full);
  let thumbnailKey: string | undefined;
  try {
    thumbnailKey = await imageStorage.put(normalized.thumbnail);
    const storedThumbnailKey = thumbnailKey;
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "WardrobeItem" WHERE id = ${itemId} AND "userId" = ${userId} FOR UPDATE`;
      if (
        !(await tx.wardrobeItem.findFirst({
          where: { id: itemId, userId, archivedAt: null },
        }))
      )
        notFound("WARDROBE_ITEM");
      if ((await tx.itemImage.count({ where: { userId, itemId } })) >= 5)
        throw new AppError("IMAGE_LIMIT", "Maximum 5 photos par pièce.");
      return tx.itemImage.create({
        data: {
          userId,
          itemId,
          key,
          thumbnailKey: storedThumbnailKey,
          width: normalized.width,
          height: normalized.height,
        },
      });
    });
  } catch (error) {
    await imageStorage.remove(key);
    if (thumbnailKey) await imageStorage.remove(thumbnailKey);
    throw error;
  }
}
export async function getImage(userId: string, id: string, thumbnail = false) {
  const image = await db.itemImage.findFirst({ where: { id, userId } });
  if (!image) notFound("IMAGE");
  return imageStorage.get(thumbnail ? image.thumbnailKey : image.key);
}
export async function removeImage(userId: string, id: string) {
  const image = await db.itemImage.findFirst({ where: { id, userId } });
  if (!image) notFound("IMAGE");
  await db.itemImage.deleteMany({ where: { id, userId } });
  const results = await Promise.allSettled([
    imageStorage.remove(image.key),
    imageStorage.remove(image.thumbnailKey),
  ]);
  if (results.some((r) => r.status === "rejected"))
    console.error(
      JSON.stringify({ event: "media_cleanup_failed", imageId: id }),
    );
}
