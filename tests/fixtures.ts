import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { itemSchema } from "@/modules/wardrobe/domain/schemas";
import { variantSchema } from "@/modules/outfits/application/service";
export async function userFactory(name = "Test") {
  return db.user.create({
    data: { name, email: randomUUID() + "@example.test" },
  });
}
export function itemFactory(
  locationId: string,
  overrides: Record<string, unknown> = {},
) {
  return itemSchema.parse({
    name: "Jean noir",
    category: "BOTTOM",
    locationId,
    ...overrides,
  });
}
export function variantFactory(
  itemIds: string[],
  overrides: Record<string, unknown> = {},
) {
  return variantSchema.parse({ name: "Principale", itemIds, ...overrides });
}
export async function cleanupUsers(userIds: string[]) {
  // Test-owned resources only; never truncate a developer database.
  await db.wearLogItem.deleteMany({ where: { userId: { in: userIds } } });
  await db.wearLog.deleteMany({ where: { userId: { in: userIds } } });
  await db.outfitPlan.deleteMany({ where: { userId: { in: userIds } } });
  await db.outfitVariantItem.deleteMany({ where: { userId: { in: userIds } } });
  await db.outfitVariant.deleteMany({ where: { userId: { in: userIds } } });
  await db.outfit.deleteMany({ where: { userId: { in: userIds } } });
  await db.itemImage.deleteMany({ where: { userId: { in: userIds } } });
  await db.wardrobeItem.deleteMany({ where: { userId: { in: userIds } } });
  await db.userPreference.deleteMany({ where: { userId: { in: userIds } } });
  await db.wardrobeLocation.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
}
