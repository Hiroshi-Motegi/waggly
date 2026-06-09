import { isNative } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://www.waggly.jp";

export function apiUrl(path: string): string {
  return isNative() ? `${API_BASE}${path}` : path;
}

/**
 * Check if we're in local mode (native + no signed-in user).
 * Uses Supabase session presence as the check.
 */
let _localModeCache: boolean | null = null;
let _localModeCacheTime = 0;

async function isLocalMode(): Promise<boolean> {
  if (!isNative()) return false;
  // Cache for 5 seconds to avoid repeated session checks
  if (_localModeCache !== null && Date.now() - _localModeCacheTime < 5000) {
    return _localModeCache;
  }
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    _localModeCache = !session;
    _localModeCacheTime = Date.now();
    return _localModeCache;
  } catch {
    _localModeCache = true;
    _localModeCacheTime = Date.now();
    return true;
  }
}

/** Reset local mode cache (call after sign-in/sign-out) */
export function resetLocalModeCache() {
  _localModeCache = null;
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // Web: always use API
  if (!isNative()) {
    return fetch(path, init);
  }

  // Native: check if local mode
  const local = await isLocalMode();
  if (local) {
    return handleLocalRequest(path, init);
  }

  // Native + signed in: use API with JWT
  const url = apiUrl(path);
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...init, headers });
}

// ---------------------------------------------------------------------------
// Local SQLite request handler — maps API paths to SQLite operations
// ---------------------------------------------------------------------------

async function handleLocalRequest(path: string, init?: RequestInit): Promise<Response> {
  const method = init?.method?.toUpperCase() ?? "GET";
  const body = init?.body ? JSON.parse(init.body as string) : null;
  const { query, execute } = await import("@/lib/sqlite/database");

  try {
    const result = await routeLocal(path, method, body, query, execute);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function routeLocal(
  path: string,
  method: string,
  body: any,
  q: typeof import("@/lib/sqlite/database").query,
  ex: typeof import("@/lib/sqlite/database").execute
): Promise<any> {
  // ---- Clubs ----

  // GET /api/clubs?status=bag&bag_number=1
  if (path.match(/^\/api\/clubs(\?|$)/) && method === "GET") {
    const params = new URLSearchParams(path.split("?")[1] ?? "");
    let sql = "SELECT * FROM clubs";
    const conds: string[] = [];
    const status = params.get("status");
    const bagNum = params.get("bag_number");
    if (status) conds.push(`status = '${status}'`);
    if (bagNum) conds.push(`bag_number = ${bagNum}`);
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY sort_order ASC";
    const clubs = await q(sql);
    return clubs.map((c: any) => ({ ...c, club_images: [] }));
  }

  // POST /api/clubs
  if (path === "/api/clubs" && method === "POST") {
    const id = body.id || crypto.randomUUID();
    const now = new Date().toISOString();
    // Get next sort_order
    const maxRows = await q("SELECT MAX(sort_order) as max_order FROM clubs WHERE status = 'bag' AND bag_number = ?", [body.bag_number ?? 1]);
    const nextOrder = (maxRows[0]?.max_order ?? -1) + 1;
    await ex(
      `INSERT INTO clubs (id, user_id, category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance, release_year, memo, purchase_date, purchase_shop, purchase_price, status, bag_number, sort_order, weight, swing_weight, frequency, kick_point, head_volume, head_weight, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, "local", body.category, body.club_number, body.maker ?? null, body.model ?? null, body.shaft_name ?? null, body.shaft_flex ?? null, body.loft ?? null, body.lie ?? null, body.length ?? null, body.distance ?? null, body.release_year ?? null, body.memo ?? null, body.purchase_date ?? null, body.purchase_shop ?? null, body.purchase_price ?? null, body.status ?? "bag", body.bag_number ?? 1, nextOrder, body.weight ?? null, body.swing_weight ?? null, body.frequency ?? null, body.kick_point ?? null, body.head_volume ?? null, body.head_weight ?? null, now]
    );
    return { id, ...body, sort_order: nextOrder, created_at: now, club_images: [] };
  }

  // GET /api/clubs/:id
  let match = path.match(/^\/api\/clubs\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM clubs WHERE id = ?", [match[1]]);
    if (!rows.length) return null;
    return { ...rows[0], club_images: [], maintenances: [] };
  }

  // PATCH /api/clubs/:id
  if (match && method === "PATCH") {
    const clubId = match[1];
    const fields = Object.keys(body).filter((k) => k !== "id");
    if (fields.length > 0) {
      const sets = fields.map((k) => `${k} = ?`).join(", ");
      const vals = fields.map((k) => body[k]);
      await ex(`UPDATE clubs SET ${sets} WHERE id = ?`, [...vals, clubId]);
    }
    const rows = await q("SELECT * FROM clubs WHERE id = ?", [clubId]);
    return rows[0] ? { ...rows[0], club_images: [] } : null;
  }

  // DELETE /api/clubs/:id
  if (match && method === "DELETE") {
    await ex("DELETE FROM clubs WHERE id = ?", [match[1]]);
    return { success: true };
  }

  // PATCH /api/clubs/sort (bulk sort_order update)
  if (path === "/api/clubs/sort" && method === "PATCH") {
    if (Array.isArray(body)) {
      for (const item of body) {
        await ex("UPDATE clubs SET sort_order = ? WHERE id = ?", [item.sort_order, item.id]);
      }
    } else if (body.clubs) {
      for (const item of body.clubs) {
        await ex("UPDATE clubs SET sort_order = ? WHERE id = ?", [item.sort_order, item.id]);
      }
    }
    return { success: true };
  }

  // GET /api/clubs/:id/history
  match = path.match(/^\/api\/clubs\/([^/]+)\/history$/);
  if (match && method === "GET") {
    const clubId = match[1];
    const memos = await q("SELECT *, 'memo' as type, created_at as date FROM club_memos WHERE club_id = ? ORDER BY created_at DESC", [clubId]);
    return memos;
  }

  // GET /api/clubs/:id/summary
  match = path.match(/^\/api\/clubs\/([^/]+)\/summary$/);
  if (match && method === "GET") {
    return { totalBalls: 0, avgDistance: null, memoCount: 0, topTags: [] };
  }

  // ---- Club Memos ----

  // GET /api/clubs/:id/memos
  match = path.match(/^\/api\/clubs\/([^/]+)\/memos$/);
  if (match && method === "GET") {
    return q("SELECT * FROM club_memos WHERE club_id = ? ORDER BY created_at DESC", [match[1]]);
  }

  // POST /api/clubs/:id/memos
  if (match && method === "POST") {
    const clubId = match[1];
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ex(
      `INSERT INTO club_memos (id, club_id, distance, memo, condition, symptom_tags, feeling_tags, gear_tags, practice_session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clubId, body.distance ?? null, body.memo ?? null, body.condition ?? null, JSON.stringify(body.symptom_tags ?? []), JSON.stringify(body.feeling_tags ?? []), JSON.stringify(body.gear_tags ?? []), body.practice_session_id ?? null, now]
    );
    return { id, club_id: clubId, ...body, created_at: now };
  }

  // GET /api/clubs/:clubId/memos/:memoId
  match = path.match(/^\/api\/clubs\/([^/]+)\/memos\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM club_memos WHERE id = ? AND club_id = ?", [match[2], match[1]]);
    return rows[0] ?? null;
  }

  // PATCH /api/clubs/:clubId/memos/:memoId
  if (match && method === "PATCH") {
    const fields = Object.keys(body).filter((k) => k !== "id");
    if (fields.length > 0) {
      const sets = fields.map((k) => `${k} = ?`).join(", ");
      const vals = fields.map((k) => Array.isArray(body[k]) ? JSON.stringify(body[k]) : body[k]);
      await ex(`UPDATE club_memos SET ${sets} WHERE id = ?`, [...vals, match[2]]);
    }
    const rows = await q("SELECT * FROM club_memos WHERE id = ?", [match[2]]);
    return rows[0] ?? null;
  }

  // DELETE /api/clubs/:clubId/memos/:memoId
  if (match && method === "DELETE") {
    await ex("DELETE FROM club_memos WHERE id = ?", [match[2]]);
    return { success: true };
  }

  // ---- Maintenances ----

  // GET /api/clubs/:id/maintenances
  match = path.match(/^\/api\/clubs\/([^/]+)\/maintenances$/);
  if (match && method === "GET") {
    return q("SELECT * FROM maintenances WHERE club_id = ? ORDER BY done_at DESC", [match[1]]);
  }

  // POST /api/clubs/:id/maintenances
  if (match && method === "POST") {
    const clubId = match[1];
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ex(
      `INSERT INTO maintenances (id, club_id, type, description, shop, cost, done_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clubId, body.type, body.description ?? null, body.shop ?? null, body.cost ?? null, body.done_at, now]
    );
    return { id, club_id: clubId, ...body, created_at: now };
  }

  // GET /api/clubs/:clubId/maintenances/:maintenanceId
  match = path.match(/^\/api\/clubs\/([^/]+)\/maintenances\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM maintenances WHERE id = ? AND club_id = ?", [match[2], match[1]]);
    return rows[0] ?? null;
  }

  // PATCH /api/clubs/:clubId/maintenances/:maintenanceId
  if (match && method === "PATCH") {
    const fields = Object.keys(body).filter((k) => k !== "id");
    if (fields.length > 0) {
      const sets = fields.map((k) => `${k} = ?`).join(", ");
      const vals = fields.map((k) => body[k]);
      await ex(`UPDATE maintenances SET ${sets} WHERE id = ?`, [...vals, match[2]]);
    }
    const rows = await q("SELECT * FROM maintenances WHERE id = ?", [match[2]]);
    return rows[0] ?? null;
  }

  // DELETE /api/clubs/:clubId/maintenances/:maintenanceId
  if (match && method === "DELETE") {
    await ex("DELETE FROM maintenances WHERE id = ?", [match[2]]);
    return { success: true };
  }

  // ---- Practice Sessions ----

  // GET /api/practice
  if (path.match(/^\/api\/practice(\?|$)/) && method === "GET") {
    const sessions = await q("SELECT * FROM practice_sessions ORDER BY practiced_at DESC");
    // Attach practice_clubs for each session
    for (const s of sessions) {
      const clubs = await q("SELECT pc.*, c.club_number, c.category FROM practice_clubs pc LEFT JOIN clubs c ON pc.club_id = c.id WHERE pc.session_id = ?", [s.id]);
      s.practice_clubs = clubs.map((pc: any) => ({ ...pc, club: { id: pc.club_id, club_number: pc.club_number, category: pc.category } }));
    }
    return sessions;
  }

  // POST /api/practice
  if (path === "/api/practice" && method === "POST") {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ex(
      `INSERT INTO practice_sessions (id, user_id, practiced_at, location, total_balls, memo, rating, plan_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, "local", body.practiced_at, body.location ?? null, body.total_balls ?? null, body.memo ?? null, body.rating ?? null, body.plan_id ?? null, now]
    );
    if (body.clubs?.length > 0) {
      for (const club of body.clubs) {
        await ex(
          `INSERT INTO practice_clubs (id, session_id, club_id, balls, avg_distance) VALUES (?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), id, club.club_id, club.balls, club.avg_distance ?? null]
        );
      }
    }
    return { id, ...body, created_at: now };
  }

  // GET /api/practice/:id
  match = path.match(/^\/api\/practice\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM practice_sessions WHERE id = ?", [match[1]]);
    if (!rows.length) return null;
    const clubs = await q("SELECT pc.*, c.club_number, c.category, c.maker, c.model FROM practice_clubs pc LEFT JOIN clubs c ON pc.club_id = c.id WHERE pc.session_id = ?", [match[1]]);
    return { ...rows[0], practice_clubs: clubs.map((pc: any) => ({ ...pc, club: { id: pc.club_id, club_number: pc.club_number, category: pc.category, maker: pc.maker, model: pc.model } })) };
  }

  // PATCH /api/practice/:id
  if (match && method === "PATCH") {
    const sessionId = match[1];
    const fields = Object.keys(body).filter((k) => !["id", "clubs"].includes(k));
    if (fields.length > 0) {
      const sets = fields.map((k) => `${k} = ?`).join(", ");
      const vals = fields.map((k) => body[k]);
      await ex(`UPDATE practice_sessions SET ${sets} WHERE id = ?`, [...vals, sessionId]);
    }
    if (body.clubs) {
      await ex("DELETE FROM practice_clubs WHERE session_id = ?", [sessionId]);
      for (const club of body.clubs) {
        await ex(
          `INSERT INTO practice_clubs (id, session_id, club_id, balls, avg_distance) VALUES (?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), sessionId, club.club_id, club.balls, club.avg_distance ?? null]
        );
      }
    }
    return { id: sessionId, ...body };
  }

  // DELETE /api/practice/:id
  if (match && method === "DELETE") {
    await ex("DELETE FROM practice_clubs WHERE session_id = ?", [match[1]]);
    await ex("DELETE FROM practice_sessions WHERE id = ?", [match[1]]);
    return { success: true };
  }

  // ---- Accessories ----

  // GET /api/accessories
  if (path.match(/^\/api\/accessories(\?|$)/) && method === "GET") {
    return q("SELECT * FROM accessories ORDER BY created_at DESC");
  }

  // POST /api/accessories
  if (path === "/api/accessories" && method === "POST") {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ex(
      `INSERT INTO accessories (id, user_id, category, brand, model, memo, rating, status, purchase_url, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, "local", body.category, body.brand ?? null, body.model ?? null, body.memo ?? null, body.rating ?? null, body.status ?? "active", body.purchase_url ?? null, body.image_url ?? null, now]
    );
    return { id, ...body, created_at: now };
  }

  // GET /api/accessories/:id
  match = path.match(/^\/api\/accessories\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM accessories WHERE id = ?", [match[1]]);
    return rows[0] ?? null;
  }

  // PATCH /api/accessories/:id
  if (match && method === "PATCH") {
    const fields = Object.keys(body).filter((k) => k !== "id");
    if (fields.length > 0) {
      const sets = fields.map((k) => `${k} = ?`).join(", ");
      const vals = fields.map((k) => body[k]);
      await ex(`UPDATE accessories SET ${sets} WHERE id = ?`, [...vals, match[1]]);
    }
    const rows = await q("SELECT * FROM accessories WHERE id = ?", [match[1]]);
    return rows[0] ?? null;
  }

  // DELETE /api/accessories/:id
  if (match && method === "DELETE") {
    await ex("DELETE FROM accessories WHERE id = ?", [match[1]]);
    return { success: true };
  }

  // ---- Practice Locations ----
  if (path === "/api/practice/locations" && method === "GET") {
    const rows = await q("SELECT DISTINCT location FROM practice_sessions WHERE location IS NOT NULL ORDER BY location");
    return rows.map((r: any) => r.location);
  }

  // ---- Fallback: unsupported route ----
  throw new Error(`Local route not supported: ${method} ${path}`);
}
