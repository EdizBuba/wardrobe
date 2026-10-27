import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dateInTimezone } from "../../src/modules/planner/domain/calendar";
import { db } from "../../src/lib/db";
import { cleanupUsers } from "../fixtures";
const email = "e2e-" + randomUUID() + "@example.test";
const secondEmail = "e2e-" + randomUUID() + "@example.test";
const password = "A-strong-test-password-2026";
test.afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { in: [email, secondEmail] } },
  });
  await cleanupUsers(users.map((u) => u.id));
  await db.$disconnect();
});
test("fresh user: register, locations, photos, outfits, variant, plan, Today, wear history and isolation", async ({
  page,
  browser,
}) => {
  await page.goto("/register");
  await page.getByLabel("Votre prénom").fill("Alex");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/today/);
  await expect(
    page.getByRole("heading", { name: /Bonjour Alex/ }),
  ).toBeVisible();
  await page.goto("/settings");
  for (const [name, type] of [
    ["Appartement", "HOME"],
    ["Chez mes parents", "PARENTS_HOME"],
  ]) {
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nom", { exact: true }).fill(name);
    await dialog.getByLabel("Type", { exact: true }).selectOption(type);
    await dialog
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  const photo = await sharp({
    create: { width: 600, height: 600, channels: 3, background: "#d6cbbb" },
  })
    .png()
    .toBuffer();
  await page.goto("/wardrobe");
  for (const [name, category] of [
    ["Chemise blanche", "TOP"],
    ["Jean noir", "BOTTOM"],
  ]) {
    await page
      .getByRole("button", { name: "Ajouter une pièce", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nom de la pièce").fill(name);
    await dialog
      .getByLabel("Catégorie", { exact: true })
      .selectOption(category);
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: photo,
    });
    await dialog
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/outfits");
  await page
    .getByRole("button", { name: "Composer une tenue", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom de la tenue").fill("Cours automne");
  await dialog.getByRole("button", { name: /Chemise blanche/ }).click();
  await dialog.getByRole("button", { name: /Jean noir/ }).click();
  await dialog.getByRole("button", { name: "Enregistrer la tenue" }).click();
  await expect(
    page.getByRole("heading", { name: "Cours automne", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Disponible ici", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Variante", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom de la variante").fill("Version légère");
  await dialog.getByRole("button", { name: /Chemise blanche/ }).click();
  await dialog.getByRole("button", { name: "Enregistrer la tenue" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Version légère", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Planifier", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Date", { exact: true })
    .fill(dateInTimezone("Europe/Paris"));
  await dialog
    .getByRole("button", { name: "Enregistrer le programme" })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { name: "Cours automne", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Marquer comme portée", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Déjà portée", exact: true }),
  ).toBeDisabled();
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "Cours automne", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Chemise blanche · Jean noir", { exact: true }),
  ).toBeVisible();
  const items = (await (await page.request.get("/api/v1/items")).json()).data
    .items;
  const locations = (await (await page.request.get("/api/v1/locations")).json())
    .data;
  const outfits = (await (await page.request.get("/api/v1/outfits")).json())
    .data.outfits;
  const plans = (await (await page.request.get("/api/v1/plans")).json()).data
    .plans;
  const logs = (await (await page.request.get("/api/v1/history")).json()).data;
  const second = await browser.newContext();
  const registration = await second.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3000" },
    data: { email: secondEmail, password, name: "Other" },
  });
  expect(registration.ok()).toBe(true);
  for (const path of [
    "items/" + items[0].id,
    "locations/" + locations[0].id,
    "outfits/" + outfits[0].id,
    "plans/" + plans[0].id,
    "history/" + logs[0].id,
    "images/" + items[0].images[0].id,
  ]) {
    expect((await second.request.get("/api/v1/" + path)).status()).toBe(404);
  }
  for (const resource of [
    "items",
    "locations",
    "outfits",
    "plans",
    "history",
  ]) {
    const response = await second.request.get("/api/v1/" + resource);
    expect(response.ok()).toBe(true);
    const data = (await response.json()).data;
    expect(
      Array.isArray(data) ? data : (data.items ?? data.outfits ?? data.plans),
    ).toEqual([]);
  }
  expect(
    (
      await second.request.delete("/api/v1/items/" + items[0].id, {
        headers: { origin: "http://localhost:3000" },
      })
    ).status(),
  ).toBe(404);
  await second.close();
  // Existing items can change status independently of their location.
  await page.goto("/wardrobe");
  await page.getByRole("button", { name: /Jean noir/ }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Disponibilité", { exact: true })
    .selectOption("DIRTY");
  await dialog
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/outfits/" + outfits[0].id);
  await expect(
    page.getByText("Partiellement disponible", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Jean noir : Sale", { exact: true }),
  ).toBeVisible();
  await page.goto("/today");
  await mkdir(".local/screenshots", { recursive: true });
  await expect(
    page.getByRole("button", { name: "Déjà portée", exact: true }),
  ).toBeVisible();
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (el) =>
            (el as HTMLImageElement).complete &&
            (el as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [375, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByRole("heading", { name: /Bonjour Alex/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ".local/screenshots/today-" + width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sombre", exact: true }).click();
  await page
    .getByRole("button", { name: "Enregistrer mes préférences" })
    .click();
  await expect(page.getByText("Préférences enregistrées.")).toBeVisible();
  await page.goto("/today");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "Déjà portée", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/screenshots/today-dark-375.png",
    fullPage: true,
  });
  const manifest = await page.request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
  expect((await page.request.get("/icon-192.png")).ok()).toBe(true);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get("/api/v1/items")).status()).toBe(401);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL(/today/);
});
