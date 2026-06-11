import { execute, query } from "./database";
import { SCHEMA_VERSION, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from "./schema";

const MIGRATIONS: Record<number, string> = {
  1: SCHEMA_V1,
  2: SCHEMA_V2,
  3: SCHEMA_V3,
  4: SCHEMA_V4,
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
    try {
      await execute(migration);
    } catch (e: any) {
      // Ignore "duplicate column" errors — V1 schema already includes
      // columns that V2/V3 try to ADD via ALTER TABLE
      if (!e.message?.includes("duplicate column")) {
        throw e;
      }
    }
    await execute(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
      ["schema_version", String(v)]
    );
  }
}
