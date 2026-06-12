import { isNative } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://waggly.jp";

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

  // FormData bodies (image uploads) — save to local filesystem
  if (init?.body instanceof FormData) {
    return handleLocalImageUpload(path, method, init.body);
  }

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
    const values: any[] = [];
    if (status) { conds.push("status = ?"); values.push(status); }
    if (bagNum) { conds.push("bag_number = ?"); values.push(Number(bagNum)); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY sort_order ASC";
    const clubs = await q(sql, values);
    // Attach images for each club
    for (const c of clubs) {
      const imgs = await q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [c.id]);
      c.club_images = imgs;
    }
    return clubs;
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
    const images = await q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [match[1]]);
    const maintenances = await q("SELECT * FROM maintenances WHERE club_id = ? ORDER BY done_at DESC", [match[1]]);
    return { ...rows[0], club_images: images, maintenances };
  }

  // PATCH /api/clubs/:id
  if (match && method === "PATCH") {
    const clubId = match[1];
    const CLUB_COLUMNS = new Set([
      "category", "club_number", "maker", "model", "shaft_name", "shaft_flex",
      "loft", "lie", "length", "distance", "release_year", "memo",
      "purchase_date", "purchase_shop", "purchase_price", "status", "bag_number",
      "weight", "swing_weight", "frequency", "kick_point", "head_volume",
      "head_weight", "rating", "sort_order",
    ]);
    const fields = Object.keys(body).filter((k) => k !== "id" && CLUB_COLUMNS.has(k));
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
    const memos = await q("SELECT *, 'memo' as type, created_at as date FROM club_memos WHERE club_id = ?", [clubId]);
    for (const m of memos) {
      m.symptom_tags = JSON.parse(m.symptom_tags || "[]");
      m.feeling_tags = JSON.parse(m.feeling_tags || "[]");
      m.gear_tags = JSON.parse(m.gear_tags || "[]");
    }
    const practices = await q(
      `SELECT pc.*, ps.practiced_at, ps.location, ps.memo as session_memo, 'practice' as type, ps.practiced_at as date, ps.id as session_id
       FROM practice_clubs pc
       JOIN practice_sessions ps ON pc.session_id = ps.id
       WHERE pc.club_id = ?`, [clubId]
    );
    for (const p of practices) {
      const clubMemos = await q("SELECT * FROM club_memos WHERE club_id = ? AND practice_session_id = ?", [clubId, p.session_id]);
      const cm = clubMemos[0];
      if (cm) {
        p.condition = cm.condition;
        p.memo = cm.memo;
        p.symptom_tags = JSON.parse(cm.symptom_tags || "[]");
        p.feeling_tags = JSON.parse(cm.feeling_tags || "[]");
        p.gear_tags = JSON.parse(cm.gear_tags || "[]");
      }
    }
    const maintenances = await q(
      `SELECT *, 'maintenance' as type, done_at as date, type as maintenance_type FROM maintenances WHERE club_id = ?`, [clubId]
    );
    const all = [...memos, ...practices, ...maintenances].sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return all;
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
    const rows = await q("SELECT * FROM club_memos WHERE club_id = ? ORDER BY created_at DESC", [match[1]]);
    for (const r of rows) {
      r.symptom_tags = JSON.parse(r.symptom_tags || "[]");
      r.feeling_tags = JSON.parse(r.feeling_tags || "[]");
      r.gear_tags = JSON.parse(r.gear_tags || "[]");
    }
    return rows;
  }

  // POST /api/clubs/:id/memos
  if (match && method === "POST") {
    const clubId = match[1];
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await ex(
      `INSERT INTO club_memos (id, club_id, distance, balls, memo, condition, symptom_tags, feeling_tags, gear_tags, practice_session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clubId, body.distance ?? null, body.balls ?? null, body.memo ?? null, body.condition ?? null, JSON.stringify(body.symptom_tags ?? []), JSON.stringify(body.feeling_tags ?? []), JSON.stringify(body.gear_tags ?? []), body.practice_session_id ?? null, now]
    );
    return { id, club_id: clubId, ...body, created_at: now };
  }

  // GET /api/clubs/:clubId/memos/:memoId
  match = path.match(/^\/api\/clubs\/([^/]+)\/memos\/([^/]+)$/);
  if (match && method === "GET") {
    const rows = await q("SELECT * FROM club_memos WHERE id = ? AND club_id = ?", [match[2], match[1]]);
    const row = rows[0] ?? null;
    if (row) {
      row.symptom_tags = JSON.parse(row.symptom_tags || "[]");
      row.feeling_tags = JSON.parse(row.feeling_tags || "[]");
      row.gear_tags = JSON.parse(row.gear_tags || "[]");
    }
    return row;
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
    const params = new URLSearchParams(path.split("?")[1] ?? "");
    const month = params.get("month");

    let sql = "SELECT * FROM practice_sessions";
    const sqlParams: any[] = [];

    if (month) {
      const start = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const endDate = new Date(y, m, 1);
      const end = endDate.toISOString().split("T")[0];
      sql += " WHERE practiced_at >= ? AND practiced_at < ?";
      sqlParams.push(start, end);
    }

    sql += " ORDER BY practiced_at DESC";
    if (!month) sql += " LIMIT 20";

    const sessions = await q(sql, sqlParams);
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
        // Save club memo (condition, tags) if present
        if (club.memo) {
          const m = club.memo;
          await ex(
            `INSERT INTO club_memos (id, club_id, distance, memo, condition, symptom_tags, feeling_tags, gear_tags, practice_session_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), club.club_id, m.distance ?? club.avg_distance ?? null, m.memo ?? null, m.condition ?? null, JSON.stringify(m.symptom_tags ?? []), JSON.stringify(m.feeling_tags ?? []), JSON.stringify(m.gear_tags ?? []), id, now]
          );
        }
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
    // Attach memo for each practice club
    const clubsWithMemos = await Promise.all(clubs.map(async (pc: any) => {
      const memos = await q("SELECT * FROM club_memos WHERE club_id = ? AND practice_session_id = ?", [pc.club_id, match![1]]);
      const memo = memos[0] ?? null;
      return {
        ...pc,
        club: { id: pc.club_id, club_number: pc.club_number, category: pc.category, maker: pc.maker, model: pc.model },
        memo: memo ? { ...memo, symptom_tags: JSON.parse(memo.symptom_tags || "[]"), feeling_tags: JSON.parse(memo.feeling_tags || "[]"), gear_tags: JSON.parse(memo.gear_tags || "[]") } : null,
      };
    }));
    return { ...rows[0], practice_clubs: clubsWithMemos };
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

  // GET /api/accessories?status=active
  if (path.match(/^\/api\/accessories(\?|$)/) && method === "GET") {
    const params = new URLSearchParams(path.split("?")[1] ?? "");
    const status = params.get("status");
    let sql = "SELECT * FROM accessories";
    const params2: any[] = [];
    if (status) { sql += " WHERE status = ?"; params2.push(status); }
    sql += " ORDER BY created_at DESC";
    return q(sql, params2);
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
    const ACCESSORY_COLUMNS = new Set([
      "category", "brand", "model", "memo", "rating", "status", "purchase_url", "image_url",
    ]);
    const fields = Object.keys(body).filter((k) => k !== "id" && ACCESSORY_COLUMNS.has(k));
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

  // ---- Stubs for server-only features (return empty data in local mode) ----

  // GET /api/usage
  if (path === "/api/usage" && method === "GET") {
    return { month: new Date().toISOString().slice(0, 7), inputTokens: 0, outputTokens: 0, totalTokens: 0, limit: 100000, remaining: 100000, limitReached: false };
  }

  // GET /api/subscription
  if (path === "/api/subscription" && method === "GET") {
    return { plan_id: "free", status: "active", free_until: null };
  }

  // GET /api/export
  if (path === "/api/export" && method === "GET") {
    return {};
  }

  // GET /api/coach/plans
  if (path.match(/^\/api\/coach\/plan/) && method === "GET") {
    return [];
  }

  // GET /api/courses
  if (path.match(/^\/api\/courses/) && method === "GET") {
    return [];
  }

  // GET /api/admin/knowledge
  if (path.match(/^\/api\/admin\//) && method === "GET") {
    return [];
  }

  // ---- Fallback: unsupported route ----
  // Unsupported routes return empty data gracefully
  console.warn(`Local route not supported: ${method} ${path}`);
  if (method === "GET") return [];
  return { success: true };
}

// ---------------------------------------------------------------------------
// Local image upload — saves to device filesystem via Capacitor
// ---------------------------------------------------------------------------

async function handleLocalImageUpload(path: string, method: string, formData: FormData): Promise<Response> {
  const { execute, query } = await import("@/lib/sqlite/database");

  // DELETE image
  if (method === "DELETE") {
    // /api/clubs/:clubId/images or /api/accessories/:id/image
    let match = path.match(/^\/api\/clubs\/([^/]+)\/images$/);
    if (match) {
      await execute("DELETE FROM club_images WHERE club_id = ?", [match[1]]);
      return jsonResponse({ success: true });
    }
    match = path.match(/^\/api\/accessories\/([^/]+)\/image$/);
    if (match) {
      await execute("UPDATE accessories SET image_url = NULL WHERE id = ?", [match[1]]);
      return jsonResponse({ success: true });
    }
  }

  // POST image
  const file = formData.get("file") as File | null;
  if (!file) {
    return jsonResponse({ error: "No file" }, 400);
  }

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");

    // Convert file to base64 (chunked to avoid stack overflow on large images)
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    // Save to app data directory
    const result = await Filesystem.writeFile({
      path: `images/${fileName}`,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });

    // Convert file:// URI to webview-loadable URL
    const { Capacitor } = await import("@capacitor/core");
    const localUri = Capacitor.convertFileSrc(result.uri);

    // /api/clubs/:clubId/images
    let match = path.match(/^\/api\/clubs\/([^/]+)\/images$/);
    if (match) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      // Set as primary if first image
      const existing = await query("SELECT COUNT(*) as count FROM club_images WHERE club_id = ?", [match[1]]);
      const isPrimary = (existing[0]?.count ?? 0) === 0 ? 1 : 0;
      await execute(
        "INSERT INTO club_images (id, club_id, image_url, is_primary, created_at) VALUES (?, ?, ?, ?, ?)",
        [id, match[1], localUri, isPrimary, now]
      );
      return jsonResponse({ id, club_id: match[1], image_url: localUri, is_primary: !!isPrimary, created_at: now });
    }

    // /api/accessories/:id/image
    match = path.match(/^\/api\/accessories\/([^/]+)\/image$/);
    if (match) {
      await execute("UPDATE accessories SET image_url = ? WHERE id = ?", [localUri, match[1]]);
      return jsonResponse({ image_url: localUri });
    }

    return jsonResponse({ image_url: localUri });
  } catch (e: any) {
    return jsonResponse({ error: e.message ?? "Failed to save image" }, 500);
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
