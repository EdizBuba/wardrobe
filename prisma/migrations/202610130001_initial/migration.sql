-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'DIRTY', 'LAUNDRY', 'BORROWED', 'REPAIR', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('TOP', 'BOTTOM', 'OUTERWEAR', 'FOOTWEAR', 'ONE_PIECE', 'SPORTSWEAR', 'ACCESSORY', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HOME', 'PARENTS_HOME', 'TRAVEL', 'STORAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'WORN', 'DAMAGED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "PlanSlot" AS ENUM ('ALL_DAY', 'MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'system');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "theme" "Theme" NOT NULL DEFAULT 'system',
    "defaultLocationId" TEXT,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "WardrobeLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'OTHER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WardrobeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WardrobeItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT,
    "size" TEXT,
    "primaryColor" TEXT,
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "Condition" NOT NULL DEFAULT 'GOOD',
    "purchaseDate" DATE,
    "purchasePriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WardrobeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "thumbnailKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitVariant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seasonTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occasionTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutfitVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitVariantItem" (
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "wardrobeItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "layout" JSONB,

    CONSTRAINT "OutfitVariantItem_pkey" PRIMARY KEY ("variantId","wardrobeItemId")
);

-- CreateTable
CREATE TABLE "OutfitPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitVariantId" TEXT NOT NULL,
    "plannedDate" DATE NOT NULL,
    "slot" "PlanSlot" NOT NULL DEFAULT 'ALL_DAY',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutfitPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outfitVariantId" TEXT NOT NULL,
    "wornDate" DATE NOT NULL,
    "sourcePlanId" TEXT,
    "note" TEXT,
    "outfitName" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WearLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearLogItem" (
    "userId" TEXT NOT NULL,
    "wearLogId" TEXT NOT NULL,
    "wardrobeItemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,

    CONSTRAINT "WearLogItem_pkey" PRIMARY KEY ("wearLogId","wardrobeItemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "WardrobeLocation_userId_archivedAt_idx" ON "WardrobeLocation"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WardrobeLocation_id_userId_key" ON "WardrobeLocation"("id", "userId");

-- CreateIndex
CREATE INDEX "WardrobeItem_userId_locationId_status_idx" ON "WardrobeItem"("userId", "locationId", "status");

-- CreateIndex
CREATE INDEX "WardrobeItem_userId_archivedAt_idx" ON "WardrobeItem"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WardrobeItem_id_userId_key" ON "WardrobeItem"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemImage_key_key" ON "ItemImage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ItemImage_thumbnailKey_key" ON "ItemImage"("thumbnailKey");

-- CreateIndex
CREATE INDEX "ItemImage_userId_itemId_idx" ON "ItemImage"("userId", "itemId");

-- CreateIndex
CREATE INDEX "Outfit_userId_archivedAt_favorite_idx" ON "Outfit"("userId", "archivedAt", "favorite");

-- CreateIndex
CREATE UNIQUE INDEX "Outfit_id_userId_key" ON "Outfit"("id", "userId");

-- CreateIndex
CREATE INDEX "OutfitVariant_outfitId_idx" ON "OutfitVariant"("outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "OutfitVariant_id_userId_key" ON "OutfitVariant"("id", "userId");

-- CreateIndex
CREATE INDEX "OutfitVariantItem_wardrobeItemId_idx" ON "OutfitVariantItem"("wardrobeItemId");

-- CreateIndex
CREATE INDEX "OutfitPlan_userId_plannedDate_idx" ON "OutfitPlan"("userId", "plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "OutfitPlan_id_userId_key" ON "OutfitPlan"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WearLog_sourcePlanId_key" ON "WearLog"("sourcePlanId");

-- CreateIndex
CREATE INDEX "WearLog_userId_wornDate_idx" ON "WearLog"("userId", "wornDate");

-- CreateIndex
CREATE UNIQUE INDEX "WearLog_id_userId_key" ON "WearLog"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WearLog_sourcePlanId_userId_key" ON "WearLog"("sourcePlanId", "userId");

-- CreateIndex
CREATE INDEX "WearLogItem_wardrobeItemId_idx" ON "WearLogItem"("wardrobeItemId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_defaultLocationId_userId_fkey" FOREIGN KEY ("defaultLocationId", "userId") REFERENCES "WardrobeLocation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardrobeLocation" ADD CONSTRAINT "WardrobeLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardrobeItem" ADD CONSTRAINT "WardrobeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WardrobeItem" ADD CONSTRAINT "WardrobeItem_locationId_userId_fkey" FOREIGN KEY ("locationId", "userId") REFERENCES "WardrobeLocation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemImage" ADD CONSTRAINT "ItemImage_itemId_userId_fkey" FOREIGN KEY ("itemId", "userId") REFERENCES "WardrobeItem"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitVariant" ADD CONSTRAINT "OutfitVariant_outfitId_userId_fkey" FOREIGN KEY ("outfitId", "userId") REFERENCES "Outfit"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitVariantItem" ADD CONSTRAINT "OutfitVariantItem_variantId_userId_fkey" FOREIGN KEY ("variantId", "userId") REFERENCES "OutfitVariant"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitVariantItem" ADD CONSTRAINT "OutfitVariantItem_wardrobeItemId_userId_fkey" FOREIGN KEY ("wardrobeItemId", "userId") REFERENCES "WardrobeItem"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitPlan" ADD CONSTRAINT "OutfitPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitPlan" ADD CONSTRAINT "OutfitPlan_outfitVariantId_userId_fkey" FOREIGN KEY ("outfitVariantId", "userId") REFERENCES "OutfitVariant"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_outfitVariantId_userId_fkey" FOREIGN KEY ("outfitVariantId", "userId") REFERENCES "OutfitVariant"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLog" ADD CONSTRAINT "WearLog_sourcePlanId_userId_fkey" FOREIGN KEY ("sourcePlanId", "userId") REFERENCES "OutfitPlan"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLogItem" ADD CONSTRAINT "WearLogItem_wearLogId_userId_fkey" FOREIGN KEY ("wearLogId", "userId") REFERENCES "WearLog"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearLogItem" ADD CONSTRAINT "WearLogItem_wardrobeItemId_userId_fkey" FOREIGN KEY ("wardrobeItemId", "userId") REFERENCES "WardrobeItem"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
