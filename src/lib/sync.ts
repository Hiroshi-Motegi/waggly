import { query, execute } from "@/lib/sqlite/database";
import { apiFetch } from "@/lib/api-client";

interface PendingSyncRow {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  payload: string;
}

/**
 * Flush all pending sync operations to the server.
 * Processes queue in order (FIFO). Stops on first failure.
 */
export async function flushPendingSync(): Promise<void> {
  const pending = await query<PendingSyncRow>(
    "SELECT * FROM pending_sync ORDER BY id ASC"
  );

  for (const row of pending) {
    const { apiPath, method, payload } = JSON.parse(row.payload);

    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!res.ok) {
      console.error(`Sync failed for pending_sync id=${row.id}: ${res.status}`);
      break; // Stop on failure — retry next sync cycle
    }

    await execute("DELETE FROM pending_sync WHERE id = ?", [row.id]);
  }
}

/** Tables to sync from server → SQLite. */
const SYNC_TABLES = [
  { apiPath: "/api/clubs", table: "clubs" },
  { apiPath: "/api/practice", table: "practice_sessions" },
  { apiPath: "/api/accessories", table: "accessories" },
  // 子テーブル (club_memos, club_images, practice_clubs, maintenances) は
  // 親テーブルのAPI応答にネストされているため、親の同期時にキャッシュされる。
] as const;

/**
 * Full sync: flush pending → fetch all data from server → replace SQLite.
 * Call on app launch and network recovery.
 */
export async function fullSync(): Promise<void> {
  // Step 1: flush pending changes first
  await flushPendingSync();

  // Step 2: fetch each table from server and replace local data
  for (const { apiPath, table } of SYNC_TABLES) {
    try {
      const res = await apiFetch(apiPath);
      if (!res.ok) continue;

      const rows: any[] = await res.json();

      // Clear local table and re-insert
      await execute(`DELETE FROM ${table}`);

      for (const row of rows) {
        const keys = Object.keys(row).filter(
          (k) => !Array.isArray(row[k]) && typeof row[k] !== "object"
        );
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => row[k]);
        const cols = keys.join(", ");
        await execute(
          `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`,
          values
        );
      }
    } catch (e) {
      console.error(`Sync failed for ${table}:`, e);
    }
  }

  // Update last sync timestamp
  await execute(
    "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
    ["last_sync", new Date().toISOString()]
  );
}
