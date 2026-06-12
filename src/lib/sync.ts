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

      // Clear local table and child tables
      await execute(`DELETE FROM ${table}`);
      if (table === "clubs") {
        await execute("DELETE FROM club_images");
        await execute("DELETE FROM club_memos");
        await execute("DELETE FROM maintenances");
      }
      if (table === "practice_sessions") {
        await execute("DELETE FROM practice_clubs");
      }

      for (const row of rows) {
        // Insert parent row (scalar fields only)
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

        // Insert nested child rows
        const childTables: Record<string, string> = {
          club_images: "club_images",
          club_memos: "club_memos",
          maintenances: "maintenances",
          practice_clubs: "practice_clubs",
        };
        for (const [key, childTable] of Object.entries(childTables)) {
          if (Array.isArray(row[key])) {
            for (const child of row[key]) {
              const childKeys = Object.keys(child).filter(
                (k) => !Array.isArray(child[k]) && typeof child[k] !== "object"
              );
              if (childKeys.length === 0) continue;
              const childPlaceholders = childKeys.map(() => "?").join(", ");
              const childValues = childKeys.map((k) => {
                const v = child[k];
                // JSON arrays stored as strings in SQLite
                return typeof v === "object" ? JSON.stringify(v) : v;
              });
              const childCols = childKeys.join(", ");
              await execute(
                `INSERT OR REPLACE INTO ${childTable} (${childCols}) VALUES (${childPlaceholders})`,
                childValues
              );
            }
          }
        }
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

export interface DataSummary {
  lastUpdated: string | null;
  counts: { clubs: number; practices: number; accessories: number };
}

export async function getLocalDataSummary(): Promise<DataSummary> {
  const clubRows = await query<{ count: number }>("SELECT COUNT(*) as count FROM clubs");
  const practiceRows = await query<{ count: number }>("SELECT COUNT(*) as count FROM practice_sessions");
  const accessoryRows = await query<{ count: number }>("SELECT COUNT(*) as count FROM accessories");
  const metaRows = await query<{ value: string }>("SELECT value FROM sync_meta WHERE key = 'last_data_updated'");

  let lastUpdated: string | null = metaRows.length > 0 ? metaRows[0].value : null;

  // Fallback: if no sync_meta entry, use MAX(created_at) from tables
  if (!lastUpdated) {
    const dates = await query<{ latest: string | null }>(
      `SELECT MAX(latest) as latest FROM (
        SELECT MAX(created_at) as latest FROM clubs
        UNION ALL SELECT MAX(created_at) FROM practice_sessions
        UNION ALL SELECT MAX(created_at) FROM accessories
      )`
    );
    lastUpdated = dates[0]?.latest ?? null;
  }

  return {
    lastUpdated,
    counts: {
      clubs: clubRows[0]?.count ?? 0,
      practices: practiceRows[0]?.count ?? 0,
      accessories: accessoryRows[0]?.count ?? 0,
    },
  };
}

export async function collectLocalData(): Promise<{
  clubs: any[];
  accessories: any[];
  practiceSessions: any[];
}> {
  const clubs = await query<any>("SELECT * FROM clubs");
  for (const club of clubs) {
    club.club_memos = await query<any>("SELECT * FROM club_memos WHERE club_id = ?", [club.id]);
    club.club_images = await query<any>("SELECT * FROM club_images WHERE club_id = ?", [club.id]);
    club.maintenances = await query<any>("SELECT * FROM maintenances WHERE club_id = ?", [club.id]);
  }

  const accessories = await query<any>("SELECT * FROM accessories");

  const practiceSessions = await query<any>("SELECT * FROM practice_sessions");
  for (const session of practiceSessions) {
    session.practice_clubs = await query<any>("SELECT * FROM practice_clubs WHERE session_id = ?", [session.id]);
  }

  return { clubs, accessories, practiceSessions };
}

/**
 * Upload local images to the server after conflict resolution.
 * Reads image files from the device filesystem and POSTs them
 * to the server's image upload API.
 */
export async function uploadLocalImages(localData: { clubs: any[] }): Promise<void> {
  for (const club of localData.clubs) {
    const images = club.club_images ?? [];
    for (const img of images) {
      if (!img.image_url) continue;
      try {
        // Fetch the local image (accessible in WebView via capacitor:// URL)
        const res = await fetch(img.image_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const ext = img.image_url.split(".").pop()?.split("?")[0] ?? "jpg";
        const file = new File([blob], `upload.${ext}`, { type: blob.type || "image/jpeg" });

        const formData = new FormData();
        formData.append("file", file);

        await apiFetch(`/api/clubs/${club.id}/images`, {
          method: "POST",
          body: formData,
        });
      } catch (e) {
        console.error(`Failed to upload image for club ${club.id}:`, e);
        // Non-fatal — continue with other images
      }
    }
  }
}
