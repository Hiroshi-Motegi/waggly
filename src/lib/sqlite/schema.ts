/** Schema version — increment when adding migrations. */
export const SCHEMA_VERSION = 1;

/** SQLite DDL for all mirrored tables + sync metadata. */
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  club_number TEXT NOT NULL,
  maker TEXT,
  model TEXT,
  shaft_name TEXT,
  shaft_flex TEXT,
  loft REAL,
  lie REAL,
  length REAL,
  distance REAL,
  release_year INTEGER,
  memo TEXT,
  purchase_date TEXT,
  purchase_shop TEXT,
  purchase_price INTEGER,
  status TEXT NOT NULL DEFAULT 'bag',
  bag_number INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weight REAL,
  swing_weight TEXT,
  frequency REAL,
  kick_point TEXT,
  head_volume REAL,
  head_weight REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS club_memos (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  distance REAL,
  memo TEXT,
  condition TEXT,
  symptom_tags TEXT DEFAULT '[]',
  feeling_tags TEXT DEFAULT '[]',
  gear_tags TEXT DEFAULT '[]',
  practice_session_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS club_images (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accessories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  memo TEXT,
  rating INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  purchase_url TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  practiced_at TEXT NOT NULL,
  location TEXT,
  total_balls INTEGER,
  memo TEXT,
  rating INTEGER,
  plan_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_clubs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  club_id TEXT NOT NULL,
  balls INTEGER NOT NULL DEFAULT 0,
  avg_distance REAL,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenances (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  shop TEXT,
  cost INTEGER,
  done_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pending_sync (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
