/**
 * SyncManager.ts — RF23
 *
 * CA-02: Detecta cambios de conectividad con expo-network.
 * CA-03: Sincronización delta — solo descarga agentes modificados desde
 *        el último sync exitoso.
 * CA-05: Al reconectar, procesa la cola de acciones offline (pausar agente, etc.)
 *        y notifica al usuario del resultado.
 * CA-06: "Server wins" — si hay conflicto entre el estado local y el servidor,
 *        prevalece el del servidor y se notifica al usuario.
 */

import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';
import {
  getLastSyncAt,
  setLastSyncAt,
  upsertAgents,
  getAllAgentsLocal,
  getPendingOfflineActions,
  deleteOfflineAction,
  incrementRetries,
  updateAgentStateLocal,
  LocalAgent,
} from './LocalDatabase';
import { API_BASE_URL } from './api';

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 30_000; // CA-04: polling cada 30s en foreground

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ConnectivityStatus = 'online' | 'offline' | 'checking';

type SyncListener = (status: ConnectivityStatus, conflicts?: ConflictInfo[]) => void;

export interface ConflictInfo {
  agent_id: string;
  local_estado: string;
  server_estado: string;
}

// ─── Estado interno ──────────────────────────────────────────────────────────

let _status: ConnectivityStatus = 'checking';
let _listeners: SyncListener[] = [];
let _syncTimer: ReturnType<typeof setInterval> | null = null;
let _appStateSubscription: any = null;

function _emit(status: ConnectivityStatus, conflicts?: ConflictInfo[]) {
  _status = status;
  _listeners.forEach(fn => fn(status, conflicts));
}

// ─── API pública ─────────────────────────────────────────────────────────────

export function getConnectivityStatus(): ConnectivityStatus {
  return _status;
}

export function addSyncListener(fn: SyncListener): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/** CA-03/CA-04: descarga solo los agentes modificados desde el último sync. */
export async function deltaSyncAgents(): Promise<{ changes: number; conflicts: ConflictInfo[] }> {
  const since = await getLastSyncAt();
  const url = `${API_BASE_URL}/agents/delta?since=${encodeURIComponent(since)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Delta sync failed: ${resp.status}`);
  const data: { server_time: string; agents: LocalAgent[] } = await resp.json();

  // CA-06: detectar conflictos (server wins)
  const localAgents = await getAllAgentsLocal();
  const localMap = new Map(localAgents.map(a => [a.id, a]));
  const conflicts: ConflictInfo[] = [];

  for (const serverAgent of data.agents) {
    const local = localMap.get(serverAgent.id);
    if (local && local.estado !== serverAgent.estado && local.updated_at < serverAgent.updated_at) {
      conflicts.push({
        agent_id: serverAgent.id,
        local_estado: local.estado,
        server_estado: serverAgent.estado,
      });
      // Aplicar server wins en cache local
      await updateAgentStateLocal(serverAgent.id, serverAgent.estado, serverAgent.updated_at);
    }
  }

  // Upsert todos los agentes del delta
  await upsertAgents(data.agents);
  await setLastSyncAt(data.server_time);

  return { changes: data.agents.length, conflicts };
}

/** CA-05: ejecuta la cola de acciones offline al reconectar. */
async function _flushOfflineQueue(): Promise<string[]> {
  const actions = await getPendingOfflineActions();
  const resultados: string[] = [];

  for (const action of actions) {
    if (action.retries >= MAX_RETRIES) {
      await deleteOfflineAction(action.id);
      resultados.push(`❌ Acción cancelada (max retries): agente ${action.agent_id}`);
      continue;
    }

    try {
      if (action.action_type === 'update_state') {
        const resp = await fetch(`${API_BASE_URL}/agents/${action.agent_id}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        await deleteOfflineAction(action.id);
        resultados.push(`✅ Estado de ${action.agent_id} sincronizado`);
      }
    } catch {
      await incrementRetries(action.id);
      resultados.push(`⚠️ Reintento ${action.retries + 1}/${MAX_RETRIES} para ${action.agent_id}`);
    }
  }

  return resultados;
}

/** Sincronización completa: flush queue + delta sync. */
export async function sincronizar(): Promise<{ conflicts: ConflictInfo[]; queued: string[] }> {
  const queued = await _flushOfflineQueue();
  const { conflicts } = await deltaSyncAgents();
  return { conflicts, queued };
}

// ─── Inicialización del SyncManager ──────────────────────────────────────────

/** Iniciar el gestor de conectividad y sync. Llamar desde _layout.tsx. */
export async function iniciarSyncManager(): Promise<void> {
  // Verificación inicial
  await _checkAndSync();

  // CA-03: polling periódico mientras la app está en foreground
  _syncTimer = setInterval(_checkAndSync, SYNC_INTERVAL_MS);

  // Detectar cambios de AppState para sincronizar al volver a foreground
  _appStateSubscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
    if (state === 'active') {
      await _checkAndSync();
    }
  });
}

export function detenerSyncManager(): void {
  if (_syncTimer) clearInterval(_syncTimer);
  _appStateSubscription?.remove();
}

async function _checkAndSync(): Promise<void> {
  try {
    const net = await Network.getNetworkStateAsync();
    const isOnline = net.isConnected && net.isInternetReachable !== false;

    if (!isOnline) {
      _emit('offline');
      return;
    }

    // CA-03/CA-05/CA-06: sincronizar al detectar conexión
    const { conflicts, queued } = await sincronizar();
    _emit('online', conflicts.length > 0 ? conflicts : undefined);

    // Log de resultados de la cola (CA-05)
    if (queued.length > 0) {
      console.info('[SyncManager] Acciones offline procesadas:', queued);
    }
  } catch (err) {
    console.warn('[SyncManager] Error en sync:', err);
    // No cambiar estado a offline por error de sync — podría ser transitorio
  }
}
