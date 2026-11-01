import { isIP } from "node:net";

export type ProductMetadata = {
  name?: string;
  brand?: string;
  color?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  imageUrl?: string;
};

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    const c = parts[2] ?? 0;
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
      return true;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase().split("%")[0] ?? "";
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("::ffff:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(lower)) return true;
    if (lower.startsWith("ff")) return true;
    if (lower.startsWith("2001:db8")) return true;
    if (lower.startsWith("64:ff9b")) return true;
    return false;
  }
  return true;
}

export function parseHttpUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return null;
  if (isIP(host) && isPrivateAddress(host)) return null;
  return url;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      } catch {
        return match;
      }
    })
    .replace(/&#(\d+);/g, (match, decimal: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      } catch {
        return match;
      }
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function clean(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (!key || key === "meta") continue;
    attributes[key] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function collectProducts(value: unknown, products: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    for (const entry of value) collectProducts(entry, products);
    return;
  }
  if (!value || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  if (node["@graph"]) collectProducts(node["@graph"], products);
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (
    types.some(
      (entry) =>
        typeof entry === "string" &&
        ["product", "productgroup"].includes(entry.toLowerCase()),
    )
  )
    products.push(node);
}

function firstImage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = firstImage(entry);
      if (image) return image;
    }
  }
  if (value && typeof value === "object" && "url" in value)
    return firstImage((value as { url?: unknown }).url);
  return undefined;
}

function brandName(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value)
    return typeof (value as { name?: unknown }).name === "string"
      ? ((value as { name: string }).name)
      : undefined;
  return undefined;
}

export function parseProductMetadata(html: string, baseUrl: string): ProductMetadata {
  const meta = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (key && attributes.content) meta.set(key, attributes.content);
  }

  const products: Record<string, unknown>[] = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = (match[1] ?? "").replace(/^\s*<!--/, "").replace(/-->\s*$/, "");
    try {
      collectProducts(JSON.parse(raw), products);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  const product = products[0] ?? {};
  const variants = Array.isArray(product.hasVariant) ? product.hasVariant : [];
  const variant = variants.find(
    (entry): entry is Record<string, unknown> =>
      Boolean(
        entry &&
          typeof entry === "object" &&
          ("offers" in entry || "image" in entry || "color" in entry),
      ),
  );
  const productOffers = product.offers;
  const rawOffers =
    Array.isArray(productOffers) && productOffers.length
      ? productOffers[0]
      : (variant?.offers ?? productOffers);
  const offers = Array.isArray(rawOffers) ? rawOffers[0] : rawOffers;
  const offer =
    offers && typeof offers === "object" ? (offers as Record<string, unknown>) : undefined;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const rawPrice =
    meta.get("product:price:amount") ??
    meta.get("og:price:amount") ??
    (offer?.price != null ? String(offer.price) : undefined) ??
    (offer?.lowPrice != null ? String(offer.lowPrice) : undefined);
  const parsedPrice = rawPrice ? Number(String(rawPrice).replace(",", ".")) : NaN;
  const priceCents =
    Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice <= 1000000
      ? Math.round(parsedPrice * 100)
      : undefined;
  const rawCurrency =
    meta.get("product:price:currency") ??
    meta.get("og:price:currency") ??
    (typeof offer?.priceCurrency === "string" ? offer.priceCurrency : undefined);
  const currency = rawCurrency && /^[A-Z]{3}$/i.test(rawCurrency)
    ? rawCurrency.toUpperCase()
    : undefined;

  const rawImage =
    meta.get("og:image") ??
    meta.get("og:image:url") ??
    meta.get("twitter:image") ??
    firstImage(product.image) ??
    firstImage(variant?.image);
  let imageUrl: string | undefined;
  if (rawImage) {
    try {
      imageUrl = new URL(rawImage, baseUrl).toString();
    } catch {
      imageUrl = undefined;
    }
  }

  const rawColor =
    meta.get("product:color") ??
    meta.get("og:color") ??
    (typeof product.color === "string" ? product.color : undefined) ??
    (typeof variant?.color === "string" ? variant.color : undefined);

  return {
    name:
      clean(meta.get("og:title") ?? meta.get("twitter:title") ?? product.name ?? title, 120) ??
      undefined,
    brand: clean(
      meta.get("product:brand") ??
        meta.get("og:brand") ??
        brandName(product.brand) ??
        meta.get("brand"),
      80,
    ),
    color: clean(rawColor, 40),
    description: clean(
      meta.get("og:description") ?? meta.get("twitter:description") ?? product.description,
      1000,
    ),
    priceCents,
    currency,
    imageUrl,
  };
}
