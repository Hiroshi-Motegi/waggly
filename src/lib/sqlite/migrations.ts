import { execute, query } from "./database";
import { SCHEMA_VERSION, SCHEMA_V1 } from "./schema";

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
};

export async function runMigrations(): Promise<void> {
  // Ensure sync_meta table exists for version tracking
  await execute(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const rows = await query<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    ["schema_version"]
  );

  const currentVersion = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;

  for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) {
      throw new Error(`Missing migration for version ${v}`);
    }
    await execute(migration);
    await execute(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
      ["schema_version", String(v)]
    );
  }
}
