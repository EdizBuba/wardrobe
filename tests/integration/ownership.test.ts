import { beforeAll, afterAll, it, expect } from "vitest";
import { db } from "@/lib/db";
import {
  userFactory,
  itemFactory,
  variantFactory,
  cleanupUsers,
} from "../fixtures";
import {
  saveLocation,
  archiveLocation,
  listLocations,
} from "@/modules/locations/application/service";
import {
  saveItem,
  getItem,
  archiveItem,
  listItems,
} from "@/modules/wardrobe/application/service";
import {
  createOutfit,
  getOutfit,
  saveVariant,
  updateOutfit,
  listOutfits,
} from "@/modules/outfits/application/service";
import { savePlan, removePlan } from "@/modules/planner/application/service";
import {
  markWorn,
  listHistory,
} from "@/modules/wear-history/application/service";
import { getImage } from "@/modules/wardrobe/application/images";
import { savePreferences } from "@/modules/users/application/service";
import { GET, PATCH } from "@/app/api/v1/[...path]/route";
let alice: string,
  bob: string,
  locationId: string,
  itemId: string,
  outfitId: string,
  variantId: string,
  planId: string;
beforeAll(async () => {
  alice = (await userFactory("Alice")).id;
  bob = (await userFactory("Bob")).id;
  locationId = (
    await saveLocation(alice, {
      name: "Appartement",
      type: "HOME",
      isDefault: true,
    })
  ).id;
  itemId = (await saveItem(alice, itemFactory(locationId))).id;
  const outfit = await createOutfit(alice, {
    name: "Cours",
    favorite: false,
    variant: variantFactory([itemId]),
  });
  outfitId = outfit.id;
  variantId = outfit.variants[0].id;
  planId = (
    await savePlan(alice, {
      outfitVariantId: variantId,
      plannedDate: "2026-10-13",
      slot: "ALL_DAY",
    })
  ).id;
});
afterAll(async () => {
  await cleanupUsers([alice, bob]);
  await db.$disconnect();
});
it("scopes location/item/outfit/plan reads and mutations", async () => {
  expect(await listLocations(bob)).toEqual([]);
  await expect(archiveLocation(bob, locationId)).rejects.toMatchObject({
    status: 404,
  });
  await expect(getItem(bob, itemId)).rejects.toMatchObject({ status: 404 });
  await expect(archiveItem(bob, itemId)).rejects.toMatchObject({ status: 404 });
  await expect(getOutfit(bob, outfitId, locationId)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    updateOutfit(bob, outfitId, { name: "Attack", favorite: false }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(removePlan(bob, planId)).rejects.toMatchObject({ status: 404 });
  expect((await getItem(alice, itemId)).name).toBe("Jean noir");
});
it("rejects foreign IDs in creates, preferences, variants and wear logs", async () => {
  await expect(saveItem(bob, itemFactory(locationId))).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    createOutfit(bob, {
      name: "Attack",
      favorite: false,
      variant: variantFactory([itemId]),
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveVariant(bob, outfitId, variantFactory([itemId]), variantId),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    savePlan(bob, {
      outfitVariantId: variantId,
      plannedDate: "2026-10-13",
      slot: "ALL_DAY",
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    markWorn(bob, {
      outfitVariantId: variantId,
      sourcePlanId: planId,
      wornDate: "2026-10-13",
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    savePreferences(bob, {
      name: "Bob",
      timezone: "Europe/Paris",
      theme: "system",
      defaultLocationId: locationId,
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(getImage(bob, itemId)).rejects.toMatchObject({ status: 404 });
});
it("enforces compound tenant foreign keys even bypassing services", async () => {
  await expect(
    db.wardrobeItem.create({
      data: { userId: bob, locationId, name: "Attack", category: "TOP" },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
  const bobLocation = await saveLocation(bob, {
    name: "Bob home",
    type: "HOME",
    isDefault: false,
  });
  const bobItem = await saveItem(bob, itemFactory(bobLocation.id));
  await expect(
    db.outfitVariantItem.create({
      data: { userId: bob, variantId, wardrobeItemId: bobItem.id },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
});
it("preserves an immutable history snapshot and idempotent plan completion", async () => {
  const input = {
    outfitVariantId: variantId,
    sourcePlanId: planId,
    wornDate: "2026-10-13",
  };
  const logs = await Promise.all([
    markWorn(alice, input),
    markWorn(alice, input),
  ]);
  expect(logs[0].id).toBe(logs[1].id);
  expect(await listHistory(bob)).toEqual([]);
  const replacement = await saveItem(
    alice,
    itemFactory(locationId, { name: "Chemise" }),
  );
  await saveVariant(
    alice,
    outfitId,
    variantFactory([replacement.id], { name: "Modifiée" }),
    variantId,
  );
  await archiveItem(alice, itemId);
  const history = await listHistory(alice);
  expect(history[0].items[0].wardrobeItemId).toBe(itemId);
  expect(history[0].items[0].itemName).toBe("Jean noir");
  expect(history[0].variantName).toBe("Principale");
  await removePlan(alice, planId);
  expect((await listHistory(alice))[0].sourcePlanId).toBeNull();
});
it("rejects unauthenticated API requests and foreign-origin mutations", async () => {
  const response = await GET(new Request("http://localhost:3000/api/v1/items"));
  expect(response.status).toBe(401);
  const spoofed = await GET(
    new Request("http://localhost:3000/api/v1/items", {
      headers: { cookie: "better-auth.session_token=forged" },
    }),
  );
  expect(spoofed.status).toBe(401);
  const crossOrigin = await PATCH(
    new Request("http://localhost:3000/api/v1/me", {
      method: "PATCH",
      headers: { origin: "https://evil.test" },
      body: "{}",
    }),
  );
  expect(crossOrigin.status).toBe(403);
});
it("serializes default location changes", async () => {
  await Promise.all([
    saveLocation(bob, { name: "One", type: "HOME", isDefault: true }),
    saveLocation(bob, { name: "Two", type: "OTHER", isDefault: true }),
  ]);
  const locations = await listLocations(bob);
  expect(locations.filter((l) => l.isDefault)).toHaveLength(1);
  const preference = await db.userPreference.findUniqueOrThrow({
    where: { userId: bob },
  });
  expect(preference.defaultLocationId).toBe(
    locations.find((l) => l.isDefault)!.id,
  );
});
it("filters the full inventory before applying pagination", async () => {
  await db.wardrobeItem.createMany({
    data: Array.from({ length: 55 }, (_, i) => ({
      userId: alice,
      locationId,
      name: "Filler " + i,
      category: "TOP" as const,
    })),
  });
  await saveItem(
    alice,
    itemFactory(locationId, { name: "Pagination target", status: "REPAIR" }),
  );
  const result = await listItems(alice, 1, locationId, {
    search: "pagination",
    status: "REPAIR",
  });
  expect(result.total).toBe(1);
  expect(result.items[0].name).toBe("Pagination target");
  expect((await listItems(alice, 2, locationId)).items.length).toBeGreaterThan(
    0,
  );
});
it("uses persisted availability and exact tag filters in the outfit gallery", async () => {
  const unavailable = await saveItem(
    alice,
    itemFactory(locationId, { name: "Dirty piece", status: "DIRTY" }),
  );
  await createOutfit(alice, {
    name: "Unavailable",
    favorite: true,
    variant: variantFactory([unavailable.id], { seasonTags: ["Winter"] }),
  });
  const available = await listOutfits(alice, locationId, 1, { available: "1" });
  expect(
    available.outfits.every((o) =>
      o.variants.some((v) => v.availability.status === "AVAILABLE"),
    ),
  ).toBe(true);
  const filtered = await listOutfits(alice, locationId, 1, {
    favorite: "1",
    season: "Winter",
  });
  expect(filtered.total).toBe(1);
  expect(filtered.outfits[0].name).toBe("Unavailable");
});
