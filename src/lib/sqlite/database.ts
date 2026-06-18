import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

const DB_NAME = "waggly";

let connection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

export async function getDb(): Promise<SQLiteDBConnection> {
  if (db) return db;

  connection = new SQLiteConnection(CapacitorSQLite);
  const isConsistent = (await connection.checkConnectionsConsistency()).result;
  const isConnected = (await connection.isConnection(DB_NAME, false)).result;

  if (isConsistent && isConnected) {
    db = await connection.retrieveConnection(DB_NAME, false);
  } else {
    // JS wrapper and native layer are out of sync — reset and recreate
    try { await connection.closeAllConnections(); } catch (e) { console.warn("SQLite close:", e); }
    db = await connection.createConnection(
      DB_NAME,
      false,
      "no-encryption",
      1,
      false
    );
  }

  await db.open();
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  if (connection) {
    await connection.closeConnection(DB_NAME, false);
    connection = null;
  }
}

export async function execute(sql: string, values?: unknown[]): Promise<void> {
  const database = await getDb();
  if (values && values.length > 0) {
    // Parameterized DML (INSERT, UPDATE, DELETE) uses run()
    await database.run(sql, values);
  } else {
    // DDL or non-parameterized statements use execute()
    await database.execute(sql);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, any>>(
  sql: string,
  values?: unknown[]
): Promise<T[]> {
  const database = await getDb();
  const result = await database.query(sql, values);
  return (result.values ?? []) as T[];
}
