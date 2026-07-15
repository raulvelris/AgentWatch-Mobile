/**
 * LocalDatabase.ts — RF23 CA-01
 *
 * Capa de persistencia local con expo-sqlite.
 * Esquema:
 *   - agents        : caché de agentes (estado offline)
 *   - sync_meta     : metadatos de sincronización (último timestamp)
 *   - offline_queue : cola de acciones realizadas offline (CA-05)
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'agentwatch.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _initSchema(_db);
  return _db;
}

async function _initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    -- CA-01: caché local de agentes
    CREATE TABLE IF NOT EXISTS agents (
      id         TEXT PRIMARY KEY,
      nombre     TEXT NOT NULL,
      tipo       TEXT NOT NULL,
      estado     TEXT NOT NULL,
      tenant_id  TEXT NOT NULL,
      owner      TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00+00:00'
    );

    -- CA-03: metadato de última sincronización exitosa
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- CA-05: cola de acciones realizadas sin conexión
    CREATE TABLE IF NOT EXISTS offline_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      agent_id    TEXT NOT NULL,
      payload     TEXT NOT NULL,  -- JSON
      created_at  TEXT NOT NULL,
      retries     INTEGER NOT NULL DEFAULT 0
    );
  `);
}

// ─── agents ──────────────────────────────────────────────────────────────────

export interface LocalAgent {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  tenant_id: string;
  owner: string;
  updated_at: string;
}

export async function upsertAgents(agents: LocalAgent[]): Promise<void> {
  if (agents.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const a of agents) {
      await db.runAsync(
        `INSERT INTO agents (id, nombre, tipo, estado, tenant_id, owner, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre     = excluded.nombre,
           tipo       = excluded.tipo,
           estado     = excluded.estado,
           tenant_id  = excluded.tenant_id,
           owner      = excluded.owner,
           updated_at = excluded.updated_at`,
        [a.id, a.nombre, a.tipo, a.estado, a.tenant_id, a.owner, a.updated_at]
      );
    }
  });
}

export async function getAllAgentsLocal(): Promise<LocalAgent[]> {
  const db = await getDb();
  return db.getAllAsync<LocalAgent>('SELECT * FROM agents ORDER BY nombre');
}

/** CA-06: actualiza el estado localmente al aplicar server-wins. */
export async function updateAgentStateLocal(id: string, estado: string, updated_at: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE agents SET estado = ?, updated_at = ? WHERE id = ?',
    [estado, updated_at, id]
  );
}

// ─── sync_meta ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'last_sync_at';

export async function getLastSyncAt(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    [LAST_SYNC_KEY]
  );
  return row?.value ?? '1970-01-01T00:00:00+00:00';
}

export async function setLastSyncAt(timestamp: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [LAST_SYNC_KEY, timestamp]
  );
}

// ─── offline_queue ────────────────────────────────────────────────────────────

export interface OfflineAction {
  id: number;
  action_type: string;
  agent_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
}

export async function enqueueOfflineAction(
  action_type: string,
  agent_id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_queue (action_type, agent_id, payload, created_at, retries)
     VALUES (?, ?, ?, ?, 0)`,
    [action_type, agent_id, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function getPendingOfflineActions(): Promise<OfflineAction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number; action_type: string; agent_id: string;
    payload: string; created_at: string; retries: number;
  }>('SELECT * FROM offline_queue ORDER BY id');
  return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}

export async function deleteOfflineAction(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM offline_queue WHERE id = ?', [id]);
}

export async function incrementRetries(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE offline_queue SET retries = retries + 1 WHERE id = ?', [id]);
}
