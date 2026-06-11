import { isNative } from "@/lib/platform";
import { apiFetch } from "@/lib/api-client";

async function checkOnline(): Promise<boolean> {
  if (!isNative()) return navigator.onLine;
  const { Network } = await import("@capacitor/network");
  const status = await Network.getStatus();
  return status.connected;
}

/**
 * Read data: online → API (+ cache to SQLite), offline → SQLite.
 * On web, always uses API (no SQLite).
 */
export async function fetchData<T = any>(
  apiPath: string,
  tableName: string,
  queryOverride?: string
): Promise<T[]> {
  if (!isNative()) {
    const res = await apiFetch(apiPath);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  const online = await checkOnline();
  const { query, execute } = await import("@/lib/sqlite/database");

  if (online) {
    const res = await apiFetch(apiPath);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: T[] = await res.json();

    // Cache to SQLite (best-effort)
    try {
      for (const row of data as any[]) {
        const keys = Object.keys(row).filter((k) => !Array.isArray(row[k]) && typeof row[k] !== "object");
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => row[k]);
        const cols = keys.join(", ");
        await execute(
          `INSERT OR REPLACE INTO ${tableName} (${cols}) VALUES (${placeholders})`,
          values
        );
      }
    } catch {
      // Cache failure is non-fatal
    }

    return data;
  }

  // Offline: read from SQLite
  const sql = queryOverride ?? `SELECT * FROM ${tableName}`;
  return query<T>(sql);
}

/**
 * Write data: online → API送信, offline → pending_syncにキュー。
 */
export async function mutateData<T = any>(
  apiPath: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: any
): Promise<T | null> {
  if (!isNative()) {
    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    if (method === "DELETE") return null;
    return res.json();
  }

  const online = await checkOnline();
  const { execute } = await import("@/lib/sqlite/database");

  async function touchLastDataUpdated() {
    await execute(
      "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)",
      ["last_data_updated", new Date().toISOString()]
    );
  }

  if (online) {
    const res = await apiFetch(apiPath, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    await touchLastDataUpdated();
    if (method === "DELETE") return null;
    return res.json();
  }

  // Offline: queue for sync
  await execute(
    "INSERT INTO pending_sync (table_name, record_id, action, payload) VALUES (?, ?, ?, ?)",
    [
      apiPath.split("/")[2] ?? "unknown",
      payload?.id ?? "",
      method,
      JSON.stringify({ apiPath, method, payload }),
    ]
  );
  await touchLastDataUpdated();

  return payload as T;
}
