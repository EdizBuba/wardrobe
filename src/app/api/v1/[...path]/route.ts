import { z } from "zod";
import { privateRoute, readJson,} from "@/lib/http";
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
  getPreferences,
  savePreferences,
  preferenceSchema,
} from "@/modules/users/application/service";
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
  throw new AppError("ENDPOINT_NOT_FOUND", "Route introuvable.", 404);
});
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
