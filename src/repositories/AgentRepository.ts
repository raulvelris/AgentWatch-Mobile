import { Agent } from '../models/Agent';
import { StorageService } from '../services/StorageService';
import { API_BASE_URL } from '../services/api';

const AGENTS_KEY = '@agents_data';

export const AgentRepository = {
  async getAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      // Mapear del formato Backend (AgentConfig) al formato Mobile (Agent)
      const mappedAgents: Agent[] = data.agents.map((backendAgent: any) => ({
        id: backendAgent.id,
        name: backendAgent.nombre,
        description: backendAgent.proposito,
        state: backendAgent.estado,
        health: 'healthy', // Simulado ya que el backend no lo provee aún
        createdAt: new Date().toISOString() // Simulado
      }));

      // Guardar en cache local por si se pierde conexión
      await StorageService.setItem(AGENTS_KEY, mappedAgents);
      return mappedAgents;
    } catch (error) {
      console.error('Error fetching agents from API, falling back to cache:', error);
      const cached = await StorageService.getItem<Agent[]>(AGENTS_KEY);
      return cached || [];
    }
  },

  async updateAgentState(id: string, newState: Agent['state']): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newState })
      });

      if (!response.ok) throw new Error('Failed to update agent state');

      // Actualizamos cache tras éxito
      const agents = await this.getAgents();
      return agents.find(a => a.id === id) as Agent;
    } catch (error) {
      console.error('Error updating state via API:', error);
      throw error;
    }
  }
};
