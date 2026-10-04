CREATE UNIQUE INDEX "WardrobeLocation_one_active_default_per_user"
ON "WardrobeLocation" ("userId") WHERE "isDefault" = true AND "archivedAt" IS NULL;
CREATE UNIQUE INDEX "OutfitVariant_one_default_per_outfit"
ON "OutfitVariant" ("outfitId") WHERE "isDefault" = true;
