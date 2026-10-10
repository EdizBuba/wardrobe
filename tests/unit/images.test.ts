import { it, expect } from "vitest";
import sharp from "sharp";
import {
  normalizeImage,
  FilesystemImageStorage,
} from "@/modules/wardrobe/infrastructure/image-storage";
it("rejects HTML/SVG and oversized uploads", async () => {
  await expect(
    normalizeImage(Buffer.from("<svg></svg>")),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  await expect(
    normalizeImage(new Uint8Array(8 * 1024 * 1024 + 1)),
  ).rejects.toMatchObject({ code: "IMAGE_SIZE" });
});
it("normalizes photos and creates a smaller thumbnail without EXIF", async () => {
  const bytes = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#ccc" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const result = await normalizeImage(bytes);
  const metadata = await sharp(result.full).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBe(1600);
  expect(metadata.exif).toBeUndefined();
  expect((await sharp(result.thumbnail).metadata()).width).toBe(480);
});
it("rejects path traversal", async () => {
  await expect(
    new FilesystemImageStorage().get("../secret"),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE_KEY" });
});
