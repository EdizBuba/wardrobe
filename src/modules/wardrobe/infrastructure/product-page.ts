import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/lib/errors";
import { normalizeImage } from "./image-storage";
import {
  isPrivateAddress,
  parseHttpUrl,
  parseProductMetadata,
  type ProductMetadata,
} from "./product-metadata";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT =
  "Wardrobe/0.1 (+https://wardrobe.ediz-buba.com; product preview)";

export type ProductPreview = ProductMetadata & {
  sourceUrl: string;
  imageDataUrl?: string;
};

function blocked() {
  return new AppError(
    "PREVIEW_BLOCKED",
    "Ce site bloque la récupération automatique. Ajoute la photo manuellement.",
    422,
  );
}

function failed() {
  return new AppError(
    "PREVIEW_FAILED",
    "Impossible de récupérer les informations de cet article.",
    422,
  );
}

async function assertSafeHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw failed();
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw blocked();
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw failed();
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
    throw blocked();
}

async function readLimited(response: Response, maxBytes: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError("PREVIEW_TOO_LARGE", "La page est trop volumineuse.", 422);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchLimited(url: URL, accept: string, maxBytes: number) {
  let current = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertSafeHost(current);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: accept,
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
      });
    } catch {
      throw failed();
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw failed();
      const next = parseHttpUrl(new URL(location, current).toString());
      if (!next) throw failed();
      current = next;
      continue;
    }
    if ([401, 403, 429].includes(response.status)) throw blocked();
    if (!response.ok) throw failed();
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes)
      throw new AppError("PREVIEW_TOO_LARGE", "La page est trop volumineuse.", 422);
    const bytes = await readLimited(response, maxBytes);
    return {
      bytes,
      finalUrl: current,
      contentType: response.headers.get("content-type") ?? "",
    };
  }
  throw new AppError("PREVIEW_REDIRECT", "Trop de redirections.", 422);
}

export async function previewProduct(input: string): Promise<ProductPreview> {
  const url = parseHttpUrl(input);
  if (!url) throw new AppError("PREVIEW_URL", "Lien invalide.", 400);

  const page = await fetchLimited(
    url,
    "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    MAX_HTML_BYTES,
  );
  const html = new TextDecoder("utf-8").decode(page.bytes);
  if (!/html|xhtml/i.test(page.contentType) && !html.trimStart().startsWith("<"))
    throw failed();

  const metadata = parseProductMetadata(html, page.finalUrl.toString());
  if (!metadata.name && !metadata.imageUrl)
    throw new AppError("PREVIEW_EMPTY", "Aucune information trouvée sur cette page.", 422);

  let imageDataUrl: string | undefined;
  if (metadata.imageUrl) {
    const imageUrl = parseHttpUrl(metadata.imageUrl);
    if (imageUrl) {
      try {
        const image = await fetchLimited(imageUrl, "image/*", MAX_IMAGE_BYTES);
        if (/^image\//i.test(image.contentType)) {
          const normalized = await normalizeImage(image.bytes);
          imageDataUrl = `data:image/webp;base64,${Buffer.from(normalized.full).toString("base64")}`;
        }
      } catch {
        // The page is still useful without its image.
      }
    }
  }

  return {
    ...metadata,
    sourceUrl: page.finalUrl.toString(),
    imageDataUrl,
  };
}
