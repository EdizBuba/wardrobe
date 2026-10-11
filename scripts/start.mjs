import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import "dotenv/config";
const standalone = resolve(".next/standalone");
await access(resolve(standalone, "server.js"));
await cp(resolve(".next/static"), resolve(standalone, ".next/static"), {
  recursive: true,
});
await cp(resolve("public"), resolve(standalone, "public"), { recursive: true });
process.env.HOSTNAME ??= "127.0.0.1";
await import(pathToFileURL(resolve(standalone, "server.js")).href);
