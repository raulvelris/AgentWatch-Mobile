/**
 * AgentRepository.ts — RF23 (reemplaza implementación anterior)
 *
 * CA-01: Cachea agentes en expo-sqlite tras cada fetch exitoso.
 * CA-02: Si no hay red, retorna datos cacheados de SQLite (sin lanzar error).
 * CA-03: Usa delta sync para descargar solo cambios incrementales.
 * CA-05: Las acciones offline (pausar agente) se encolan en SQLite
 *        y se ejecutan al reconectar via SyncManager.
 */

import { Agent } from '../models/Agent';
import { API_BASE_URL } from '../services/api';
import {
  getAllAgentsLocal,
  upsertAgents,
  enqueueOfflineAction,
  LocalAgent,
} from '../services/LocalDatabase';
import { getConnectivityStatus, deltaSyncAgents } from '../services/SyncManager';

// ─── Mapeadores ───────────────────────────────────────────────────────────────

function localToAgent(a: LocalAgent): Agent {
  return {
    id: a.id,
    name: a.nombre,
    description: a.tipo,
    state: a.estado as Agent['state'],
    health: 'healthy',
    createdAt: a.updated_at,
  };
}

function backendToLocal(b: any): LocalAgent {
  return {
    id: b.id,
    nombre: b.nombre,
    tipo: b.tipo,
    estado: b.estado,
    tenant_id: b.tenant_id ?? 'tenant_a',
    owner: b.owner ?? 'admin_a',
    updated_at: b.updated_at ?? new Date().toISOString(),
  };
}

// ─── Repositorio ──────────────────────────────────────────────────────────────

export const AgentRepository = {
  /**
   * CA-01/CA-02: intenta fetch del servidor; si falla devuelve caché SQLite.
   * Al tener conexión aplica delta sync para no re-descargar todo.
   */
  async getAgents(): Promise<Agent[]> {
    const isOnline = getConnectivityStatus() === 'online';

    if (isOnline) {
      try {
        // CA-03: intentar delta sync primero (más eficiente)
        const { changes } = await deltaSyncAgents();
        if (changes > 0) {
          console.info(`[AgentRepository] Delta sync: ${changes} agente(s) actualizados`);
        }
        // Si el delta sync falló parcialmente o no hay nada en caché, hacer full fetch
        const cached = await getAllAgentsLocal();
        if (cached.length > 0) {
          return cached.map(localToAgent);
        }
      } catch {
        // Delta sync falló → fallback a full fetch
      }

      // Full fetch como fallback o primera carga
      try {
        const resp = await fetch(`${API_BASE_URL}/agents/`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const locals = (data.agents as any[]).map(backendToLocal);
        await upsertAgents(locals);
        return locals.map(localToAgent);
      } catch (err) {
        console.warn('[AgentRepository] Full fetch falló, usando caché:', err);
      }
    }

    // CA-02: sin red → caché SQLite
    const cached = await getAllAgentsLocal();
    return cached.map(localToAgent);
  },

  /**
   * CA-05: si está offline, encola la acción en SQLite.
   * Si está online, ejecuta directamente y actualiza caché.
   */
  async updateAgentState(id: string, newState: Agent['state']): Promise<Agent> {
    const isOnline = getConnectivityStatus() === 'online';

    if (!isOnline) {
      // CA-05: encolar para ejecutar al reconectar
      await enqueueOfflineAction('update_state', id, { estado: newState });
      // Actualizar caché local optimísticamente
      await upsertAgents([{
        id,
        nombre: id,
        tipo: '',
        estado: newState,
        tenant_id: 'tenant_a',
        owner: 'admin_a',
        updated_at: new Date().toISOString(),
      }]);
      console.info(`[AgentRepository] Acción encolada offline: ${id} → ${newState}`);
      // Devolver agente desde caché con el nuevo estado aplicado
      const cached = await getAllAgentsLocal();
      const found = cached.find(a => a.id === id);
      if (found) return localToAgent({ ...found, estado: newState });
      return { id, name: id, description: '', state: newState, health: 'healthy', createdAt: new Date().toISOString() };
    }

    // Online: ejecutar directamente
    const resp = await fetch(`${API_BASE_URL}/agents/${id}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newState }),
    });
    if (!resp.ok) throw new Error(`Failed to update: HTTP ${resp.status}`);

    // Actualizar caché
    const agents = await this.getAgents();
    return agents.find(a => a.id === id) as Agent;
  },
};
