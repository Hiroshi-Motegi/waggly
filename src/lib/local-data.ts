/**
 * Local-first data access for native app without sign-in.
 * Reads/writes directly to SQLite.
 */
import { query, execute } from "@/lib/sqlite/database";

// ---------- Clubs ----------

export async function getLocalClubs(status?: string, bagNumber?: number): Promise<any[]> {
  let sql = "SELECT * FROM clubs";
  const conditions: string[] = [];
  if (status) conditions.push(`status = '${status}'`);
  if (bagNumber != null) conditions.push(`bag_number = ${bagNumber}`);
  if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY sort_order ASC";
  const clubs = await query(sql);
  // Attach empty club_images array for compatibility with ClubWithImages
  return clubs.map((c: any) => ({ ...c, club_images: [] }));
}

export async function getLocalClub(clubId: string): Promise<any | null> {
  const rows = await query("SELECT * FROM clubs WHERE id = ?", [clubId]);
  if (rows.length === 0) return null;
  return { ...rows[0], club_images: [], maintenances: [] };
}

export async function saveLocalClub(club: any): Promise<any> {
  const id = club.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await execute(
    `INSERT OR REPLACE INTO clubs (id, user_id, category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance, release_year, memo, purchase_date, purchase_shop, purchase_price, status, bag_number, sort_order, weight, swing_weight, frequency, kick_point, head_volume, head_weight, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, club.user_id ?? "local", club.category, club.club_number, club.maker ?? null, club.model ?? null, club.shaft_name ?? null, club.shaft_flex ?? null, club.loft ?? null, club.lie ?? null, club.length ?? null, club.distance ?? null, club.release_year ?? null, club.memo ?? null, club.purchase_date ?? null, club.purchase_shop ?? null, club.purchase_price ?? null, club.status ?? "bag", club.bag_number ?? 1, club.sort_order ?? 0, club.weight ?? null, club.swing_weight ?? null, club.frequency ?? null, club.kick_point ?? null, club.head_volume ?? null, club.head_weight ?? null, club.created_at ?? now]
  );
  return { ...club, id, created_at: club.created_at ?? now };
}

export async function deleteLocalClub(clubId: string): Promise<void> {
  await execute("DELETE FROM clubs WHERE id = ?", [clubId]);
}

// ---------- Practice Sessions ----------

export async function getLocalPracticeSessions(): Promise<any[]> {
  const sessions = await query("SELECT * FROM practice_sessions ORDER BY practiced_at DESC");
  // Attach empty practice_clubs for compatibility
  return sessions.map((s: any) => ({ ...s, practice_clubs: [] }));
}

export async function getLocalPracticeSession(sessionId: string): Promise<any | null> {
  const rows = await query("SELECT * FROM practice_sessions WHERE id = ?", [sessionId]);
  if (rows.length === 0) return null;
  const clubs = await query("SELECT * FROM practice_clubs WHERE session_id = ?", [sessionId]);
  return { ...rows[0], practice_clubs: clubs };
}

export async function saveLocalPracticeSession(data: any): Promise<any> {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  await execute(
    `INSERT OR REPLACE INTO practice_sessions (id, user_id, practiced_at, location, total_balls, memo, rating, plan_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, "local", data.practiced_at, data.location ?? null, data.total_balls ?? null, data.memo ?? null, data.rating ?? null, data.plan_id ?? null, data.created_at ?? now]
  );
  // Save practice clubs
  if (data.clubs?.length > 0) {
    for (const club of data.clubs) {
      const pcId = crypto.randomUUID();
      await execute(
        `INSERT INTO practice_clubs (id, session_id, club_id, balls, avg_distance) VALUES (?, ?, ?, ?, ?)`,
        [pcId, id, club.club_id, club.balls, club.avg_distance ?? null]
      );
    }
  }
  return { id, ...data, created_at: data.created_at ?? now };
}

export async function deleteLocalPracticeSession(sessionId: string): Promise<void> {
  await execute("DELETE FROM practice_clubs WHERE session_id = ?", [sessionId]);
  await execute("DELETE FROM practice_sessions WHERE id = ?", [sessionId]);
}

// ---------- Accessories ----------

export async function getLocalAccessories(): Promise<any[]> {
  return query("SELECT * FROM accessories ORDER BY created_at DESC");
}
