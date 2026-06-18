/** All tables that local SQLite sync is allowed to read/write. */
const VALID_TABLES = new Set([
  "clubs",
  "club_images",
  "club_memos",
  "maintenances",
  "practice_sessions",
  "practice_clubs",
  "accessories",
  "pending_sync",
  "sync_meta",
]);

/** Throws if table name is not in the allowlist. */
export function assertValidTable(table: string): void {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
}

/** Column names must match /^[a-z_][a-z0-9_]*$/i */
const COL_RE = /^[a-z_][a-z0-9_]*$/i;

/** Throws if any column name contains unsafe characters. */
export function assertValidColumns(columns: string[]): void {
  if (columns.length === 0) throw new Error("Empty column list");
  for (const col of columns) {
    if (!COL_RE.test(col)) {
      throw new Error(`Invalid column name: ${col}`);
    }
  }
}
