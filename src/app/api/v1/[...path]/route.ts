import { z } from "zod";
import { privateRoute, readJson, readBoundedBody } from "@/lib/http";
import { AppError, notFound } from "@/lib/errors";
import {
  idSchema,
  itemSchema,
  itemFilterSchema,
} from "@/modules/wardrobe/domain/schemas";
import {
  listLocations,
  saveLocation,
  archiveLocation,
  locationSchema,
} from "@/modules/locations/application/service";
import {
  listItems,
  getItem,
  saveItem,
  archiveItem,
} from "@/modules/wardrobe/application/service";
import {
  uploadImage,
  getImage,
  removeImage,
} from "@/modules/wardrobe/application/images";
import {
  listOutfits,
  getOutfit,
  createOutfit,
  updateOutfit,
  archiveOutfit,
  saveVariant,
  cloneVariant,
  outfitSchema,
  outfitUpdateSchema,
  variantSchema,
  outfitFilterSchema,
} from "@/modules/outfits/application/service";
import {
  listPlans,
  savePlan,
  removePlan,
  planSchema,
} from "@/modules/planner/application/service";
import {
  getPreferences,
  savePreferences,
  preferenceSchema,
} from "@/modules/users/application/service";
import {
  calendarDate,
  dateInTimezone,
} from "@/modules/planner/domain/calendar";
import { db } from "@/lib/db";
const json = (data: unknown, status = 200) =>
  Response.json({ data }, { status });
const empty = () => new Response(null, { status: 204 });
const handler = privateRoute(async (request, userId) => {
  const url = new URL(request.url);
  const path = url.pathname.split("/").slice(3);
  const [resource, rawId, child, rawChildId] = path;
  const id = rawId ? idSchema.parse(rawId) : undefined;
  const childId = rawChildId ? idSchema.parse(rawChildId) : undefined;
  const method = request.method;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(url.searchParams.get("page") ?? 1);
  const preference = await getPreferences(userId);
  const locationId = url.searchParams.has("locationId")
    ? idSchema.parse(url.searchParams.get("locationId"))
    : (preference.defaultLocationId ?? "");
  if (
    locationId &&
    !(await db.wardrobeLocation.findFirst({
      where: { id: locationId, userId, archivedAt: null },
    }))
  )
    notFound("LOCATION");
  if (resource === "me" && !id) {
    if (method === "GET")
      return json({
        user: await db.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, emailVerified: true },
        }),
        preference,
      });
    if (method === "PATCH")
      return json(
        await savePreferences(
          userId,
          preferenceSchema.parse(await readJson(request)),
        ),
      );
  }
  if (resource === "locations" && !child) {
    if (method === "GET") {
      const locations = await listLocations(userId);
      if (id) {
        const location = locations.find((l) => l.id === id);
        if (!location) notFound("LOCATION");
        return json(location);
      }
      return json(locations);
    }
    if (method === "POST" && !id)
      return json(
        await saveLocation(
          userId,
          locationSchema.parse(await readJson(request)),
        ),
        201,
      );
    if (method === "PATCH" && id)
      return json(
        await saveLocation(
          userId,
          locationSchema.parse(await readJson(request)),
          id,
        ),
      );
    if (method === "DELETE" && id) {
      await archiveLocation(userId, id);
      return empty();
    }
  }
  if (resource === "items") {
    if (method === "POST" && id && child === "images" && !childId) {
      const bytes = await readBoundedBody(request, 9 * 1024 * 1024);
      const form = await new Response(bytes, {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      })
        .formData()
        .catch(() => {
          throw new AppError("INVALID_FORM", "Formulaire de photo invalide.");
        });
      const file = form.get("file");
      if (!(file instanceof File))
        throw new AppError("IMAGE_REQUIRED", "Choisissez une photo.");
      return json(
        await uploadImage(userId, id, new Uint8Array(await file.arrayBuffer())),
        201,
      );
    }
    if (!child) {
      if (method === "GET")
        return json(
          id
            ? await getItem(userId, id)
            : await listItems(
                userId,
                page,
                url.searchParams.has("locationId") ? locationId : undefined,
                itemFilterSchema.parse(Object.fromEntries(url.searchParams)),
              ),
        );
      if (method === "POST" && !id)
        return json(
          await saveItem(userId, itemSchema.parse(await readJson(request))),
          201,
        );
      if (method === "PATCH" && id)
        return json(
          await saveItem(userId, itemSchema.parse(await readJson(request)), id),
        );
      if (method === "DELETE" && id) {
        await archiveItem(userId, id);
        return empty();
      }
    }
  }
  if (resource === "images" && id && !child && method === "GET") {
    const bytes = await getImage(
      userId,
      id,
      url.searchParams.get("thumbnail") === "1",
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (resource === "images" && id && !child && method === "DELETE") {
    await removeImage(userId, id);
    return empty();
  }
  if (resource === "outfits") {
    if (!child) {
      if (method === "GET")
        return json(
          id
            ? await getOutfit(userId, id, locationId)
            : await listOutfits(
                userId,
                locationId,
                page,
                outfitFilterSchema.parse(Object.fromEntries(url.searchParams)),
              ),
        );
      if (method === "POST" && !id)
        return json(
          await createOutfit(
            userId,
            outfitSchema.parse(await readJson(request)),
          ),
          201,
        );
      if (method === "PATCH" && id) {
        await updateOutfit(
          userId,
          id,
          outfitUpdateSchema.parse(await readJson(request)),
        );
        return empty();
      }
      if (method === "DELETE" && id) {
        await archiveOutfit(userId, id);
        return empty();
      }
    }
    if (id && child === "variants") {
      if (method === "POST" && childId && path[4] === "clone")
        return json(await cloneVariant(userId, id, childId), 201);
      if (method === "POST" && !childId)
        return json(
          await saveVariant(
            userId,
            id,
            variantSchema.parse(await readJson(request)),
          ),
          201,
        );
      if (method === "PATCH" && childId)
        return json(
          await saveVariant(
            userId,
            id,
            variantSchema.parse(await readJson(request)),
            childId,
          ),
        );
    }
  }
  if (resource === "plans" && !child) {
    if (method === "GET") {
      const from = calendarDate.parse(
        url.searchParams.get("from") ?? dateInTimezone(preference.timezone),
      );
      const to = calendarDate.parse(url.searchParams.get("to") ?? from);
      if (to < from || Date.parse(to) - Date.parse(from) > 366 * 86400000)
        throw new AppError(
          "DATE_RANGE",
          "Choisissez une période de moins d’un an.",
        );
      const result = await listPlans(userId, locationId, from, to);
      if (id) {
        const plan = await db.outfitPlan.findFirst({ where: { id, userId } });
        if (!plan) notFound("PLAN");
        return json(plan);
      }
      return json(result);
    }
    if (method === "POST" && !id)
      return json(
        await savePlan(userId, planSchema.parse(await readJson(request))),
        201,
      );
    if (method === "PATCH" && id)
      return json(
        await savePlan(userId, planSchema.parse(await readJson(request)), id),
      );
    if (method === "DELETE" && id) {
      await removePlan(userId, id);
      return empty();
    }
  }
  throw new AppError("ENDPOINT_NOT_FOUND", "Route introuvable.", 404);
});
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
