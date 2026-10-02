import { z } from "zod";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { idSchema, tags } from "@/modules/wardrobe/domain/schemas";
import { variantAvailability } from "@/modules/wardrobe/domain/availability";
import type { Prisma } from "@/generated/prisma/client";
export const outfitFilterSchema = z.object({
  favorite: z.enum(["1"]).optional(),
  available: z.enum(["1"]).optional(),
  season: z.string().max(40).optional(),
  occasion: z.string().max(40).optional(),
});
export const variantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  isDefault: z.boolean().default(false),
  itemIds: z
    .array(idSchema)
    .min(1)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length, "Pièces dupliquées"),
  styleTags: tags.default([]),
  seasonTags: tags.default([]),
  occasionTags: tags.default([]),
});
export const outfitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(4000).nullable().optional(),
  favorite: z.boolean().default(false),
  variant: variantSchema,
});
export const outfitUpdateSchema = outfitSchema.omit({ variant: true });
const variantInclude = {
  items: {
    include: {
      item: {
        include: {
          images: { orderBy: { createdAt: "desc" as const } },
          location: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
};
export async function listOutfits(
  userId: string,
  locationId: string,
  page = 1,
  filters: z.infer<typeof outfitFilterSchema> = {},
) {
  const variantWhere: Prisma.OutfitVariantWhereInput = {
    ...(filters.season ? { seasonTags: { has: filters.season } } : {}),
    ...(filters.occasion ? { occasionTags: { has: filters.occasion } } : {}),
    ...(filters.available
      ? {
          items: {
            some: {},
            every: {
              item: {
                userId,
                archivedAt: null,
                status: "AVAILABLE",
                locationId,
              },
            },
          },
        }
      : {}),
  };
  const where: Prisma.OutfitWhereInput = {
    userId,
    archivedAt: null,
    ...(filters.favorite ? { favorite: true } : {}),
    ...(Object.keys(variantWhere).length
      ? { variants: { some: variantWhere } }
      : {}),
  };
  const [outfits, total] = await Promise.all([
    db.outfit.findMany({
      where,
      include: {
        variants: {
          include: variantInclude,
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 24,
      take: 24,
    }),
    db.outfit.count({ where }),
  ]);
  return {
    outfits: outfits.map((outfit) => ({
      ...outfit,
      variants: outfit.variants.map((variant) => ({
        ...variant,
        availability: variantAvailability(
          variant.items.map((i) => i.item),
          userId,
          locationId,
        ),
      })),
    })),
    total,
    page,
    pageSize: 24,
  };
}
export async function getOutfit(
  userId: string,
  id: string,
  locationId: string,
) {
  const outfit = await db.outfit.findFirst({
    where: { id, userId },
    include: {
      variants: {
        include: variantInclude,
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!outfit) notFound("OUTFIT");
  return {
    ...outfit,
    variants: outfit.variants.map((variant) => ({
      ...variant,
      availability: variantAvailability(
        variant.items.map((i) => i.item),
        userId,
        locationId,
      ),
    })),
  };
}
export async function createOutfit(
  userId: string,
  input: z.infer<typeof outfitSchema>,
) {
  const { variant, ...data } = input;
  return db.$transaction(async (tx) => {
    const count = await tx.wardrobeItem.count({
      where: { id: { in: variant.itemIds }, userId, archivedAt: null },
    });
    if (count !== variant.itemIds.length) notFound("WARDROBE_ITEM");
    const { itemIds, ...variantData } = variant;
    const outfit = await tx.outfit.create({ data: { ...data, userId } });
    const createdVariant = await tx.outfitVariant.create({
      data: { ...variantData, userId, outfitId: outfit.id, isDefault: true },
    });
    await tx.outfitVariantItem.createMany({
      data: itemIds.map((wardrobeItemId, sortOrder) => ({
        userId,
        variantId: createdVariant.id,
        wardrobeItemId,
        sortOrder,
      })),
    });
    return { ...outfit, variants: [createdVariant] };
  });
}
export async function updateOutfit(
  userId: string,
  id: string,
  input: z.infer<typeof outfitUpdateSchema>,
) {
  const result = await db.outfit.updateMany({
    where: { id, userId, archivedAt: null },
    data: input,
  });
  if (!result.count) notFound("OUTFIT");
}
export async function archiveOutfit(userId: string, id: string) {
  const result = await db.outfit.updateMany({
    where: { id, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (!result.count) notFound("OUTFIT");
}
