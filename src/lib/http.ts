import { auth } from "@/modules/auth/auth";
import { AppError } from "./errors";
import { ZodError } from "zod";
import { env } from "@/config/env";
export async function readBoundedBody(request: Request, limit: number) {
  const declared = Number(request.headers.get("content-length"));
  if (declared > limit)
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      "Fichier ou requête trop volumineux.",
      413,
    );
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AppError(
        "PAYLOAD_TOO_LARGE",
        "Fichier ou requête trop volumineux.",
        413,
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(
      new TextDecoder().decode(await readBoundedBody(request, 65536)),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_JSON", "Requête JSON invalide.");
  }
}
export function privateRoute(
  handler: (request: Request, userId: string) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      if (
        !["GET", "HEAD"].includes(request.method) &&
        request.headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin
      )
        throw new AppError(
          "INVALID_ORIGIN",
          "Origine de requête non autorisée.",
          403,
        );
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session)
        throw new AppError(
          "UNAUTHENTICATED",
          "Connectez-vous pour continuer.",
          401,
        );
      const response = await handler(request, session.user.id);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof ZodError)
        return Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Vérifiez les champs du formulaire.",
              details: error.flatten(),
            },
          },
          { status: 400 },
        );
      if (error instanceof AppError)
        return Response.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        );
      console.error(
        JSON.stringify({
          event: "request_failed",
          errorType: error instanceof Error ? error.name : "Unknown",
          path: new URL(request.url).pathname,
        }),
      );
      return Response.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Une erreur est survenue. Réessayez.",
          },
        },
        { status: 500 },
      );
    }
  };
}
