import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import sharp from "sharp";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors";
export interface ImageStorage {
  put(bytes: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}
export class FilesystemImageStorage implements ImageStorage {
  constructor(private root = resolve(env.MEDIA_ROOT)) {}
  private path(key: string) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(key))
      throw new AppError("INVALID_IMAGE_KEY", "Image invalide.");
    return join(this.root, key);
  }
  async put(bytes: Uint8Array) {
    await mkdir(this.root, { recursive: true });
    const key = randomUUID() + ".webp";
    await writeFile(this.path(key), bytes, { flag: "wx" });
    return key;
  }
  async get(key: string) {
    return readFile(this.path(key));
  }
  async remove(key: string) {
    await unlink(this.path(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
export const imageStorage: ImageStorage = new FilesystemImageStorage();
export async function normalizeImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 8 * 1024 * 1024)
    throw new AppError("IMAGE_SIZE", "La photo doit faire moins de 8 Mo.");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 24000000,
      animated: false,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp", "avif", "heif"].includes(
        metadata.format ?? "",
      ) ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Unsupported format");
    // Sharp drops metadata unless keepMetadata/withMetadata is explicitly requested.
    const full = await image
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(full.data)
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return {
      full: full.data,
      thumbnail,
      width: full.info.width,
      height: full.info.height,
    };
  } catch {
    throw new AppError(
      "INVALID_IMAGE",
      "Photo invalide. Utilisez JPEG, PNG, WebP ou AVIF.",
    );
  }
}
