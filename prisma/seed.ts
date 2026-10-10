import "dotenv/config";
import sharp from "sharp";
import { auth } from "../src/modules/auth/auth";
import { db } from "../src/lib/db";
import { saveLocation } from "../src/modules/locations/application/service";
import { saveItem } from "../src/modules/wardrobe/application/service";
import { uploadImage } from "../src/modules/wardrobe/application/images";
import {
  createOutfit,
  saveVariant,
} from "../src/modules/outfits/application/service";
import { savePlan } from "../src/modules/planner/application/service";
import { dateInTimezone } from "../src/modules/planner/domain/calendar";
async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development seed is prohibited in production.");
  const email = "demo@wardrobe.local";
  const existing = await db.user.findUnique({ where: { email } });
  const user =
    existing ??
    (
      await auth.api.signUpEmail({
        body: { email, password: "Wardrobe-demo-2026!", name: "Camille" },
      })
    ).user;
  if (await db.outfit.count({ where: { userId: user.id } })) {
    console.info("Demo already seeded; existing data preserved.");
    return;
  }
  const home =
    (await db.wardrobeLocation.findFirst({
      where: { userId: user.id, name: "Appartement" },
    })) ??
    (await saveLocation(user.id, {
      name: "Appartement",
      type: "HOME",
      isDefault: true,
    }));
  const parents =
    (await db.wardrobeLocation.findFirst({
      where: { userId: user.id, name: "Chez mes parents" },
    })) ??
    (await saveLocation(user.id, {
      name: "Chez mes parents",
      type: "PARENTS_HOME",
      isDefault: false,
    }));
  const fixtures = [
    {
      name: "T-shirt écru",
      category: "TOP" as const,
      color: "#e6dcc6",
      status: "AVAILABLE" as const,
      locationId: home.id,
    },
    {
      name: "Jean noir",
      category: "BOTTOM" as const,
      color: "#353734",
      status: "AVAILABLE" as const,
      locationId: home.id,
    },
    {
      name: "Baskets blanches",
      category: "FOOTWEAR" as const,
      color: "#f5f1e6",
      status: "AVAILABLE" as const,
      locationId: home.id,
    },
    {
      name: "Veste olive",
      category: "OUTERWEAR" as const,
      color: "#727b57",
      status: "AVAILABLE" as const,
      locationId: home.id,
    },
    {
      name: "Pull gris",
      category: "TOP" as const,
      color: "#91938c",
      status: "AVAILABLE" as const,
      locationId: parents.id,
    },
    {
      name: "Pantalon sable",
      category: "BOTTOM" as const,
      color: "#baa384",
      status: "DIRTY" as const,
      locationId: home.id,
    },
    {
      name: "Baskets noires",
      category: "FOOTWEAR" as const,
      color: "#323832",
      status: "LAUNDRY" as const,
      locationId: parents.id,
    },
  ];
  const ids: string[] = [];
  for (const fixture of fixtures) {
    const { color, ...data } = fixture;
    const item = await db.wardrobeItem.findFirst({ where: { userId: user.id, name: fixture.name } }) ?? await saveItem(user.id, {
      ...data,
      condition: "GOOD",
      colors: [],
      seasons: ["Automne"],
      currency: "EUR",
      favorite: false,
      primaryColor: color,
    });
    ids.push(item.id);
    const shape =
      fixture.category === "BOTTOM"
        ? '<path d="M155 75h190l-12 150-20 200h-70l7-198-7 0-14 198h-70l-15-200z"/>'
        : fixture.category === "FOOTWEAR"
          ? '<path d="M110 255l48-85h90l25 80 110 28q35 15 20 48H100q-20-35 10-71z"/><path d="M145 346h250v15H145z" fill="#ccc8bc"/>'
          : '<path d="M170 90l-95 68 55 83 40-26v190h160V215l40 26 55-83-95-68-45-10q-35 35-70 0z"/>';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#eeefea"/><g fill="${fixture.color}" stroke="#66695d" stroke-width="2">${shape}</g></svg>`;
    if (!await db.itemImage.count({ where: { itemId: item.id } })) await uploadImage(
      user.id,
      item.id,
      await sharp(Buffer.from(svg)).png().toBuffer(),
    );
  }
  const outfit = await createOutfit(user.id, {
    name: "L’essentiel du quotidien",
    favorite: true,
    description: "Simple, confortable et prêt à partir.",
    variant: {
      name: "Sans veste",
      isDefault: true,
      itemIds: ids.slice(0, 3),
      styleTags: ["Casual"],
      seasonTags: ["Automne"],
      occasionTags: ["Cours"],
    },
  });
  await saveVariant(user.id, outfit.id, {
    name: "Avec la veste",
    isDefault: false,
    itemIds: ids.slice(0, 4),
    styleTags: ["Casual"],
    seasonTags: ["Automne"],
    occasionTags: ["Sortie"],
  });
  await createOutfit(user.id, {
    name: "Week-end au calme",
    favorite: true,
    variant: {
      name: "Version principale",
      isDefault: true,
      itemIds: [ids[4], ids[5], ids[2]],
      styleTags: [],
      seasonTags: ["Automne"],
      occasionTags: ["Week-end"],
    },
  });
  await savePlan(user.id, {
    outfitVariantId: outfit.variants[0].id,
    plannedDate: dateInTimezone("Europe/Paris"),
    slot: "ALL_DAY",
  });
  console.info(
    "Development account: demo@wardrobe.local / Wardrobe-demo-2026!",
  );
}
seed().finally(() => db.$disconnect());
