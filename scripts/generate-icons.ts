import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
for (const size of [192, 512]) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#344f40"/><g fill="none" stroke="#f6f5f1" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path d="M145 212l111-65 111 65-111 65z"/><path d="M145 265l111 65 111-65M145 318l111 65 111-65"/></g></svg>';
  await sharp(Buffer.from(svg))
    .resize(size)
    .png()
    .toFile("public/icon-" + size + ".png");
}
