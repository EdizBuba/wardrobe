import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
const pg = new EmbeddedPostgres({
  databaseDir: "./.local/postgres",
  user: "wardrobe",
  password: "wardrobe",
  port: 5432,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: console.error,
});
if (!existsSync("./.local/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'wardrobe'",
);
await client.end();
if (!result.rowCount) await pg.createDatabase("wardrobe");
console.info("Local PostgreSQL ready on 127.0.0.1:5432. Development only.");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
await new Promise(() => {});
