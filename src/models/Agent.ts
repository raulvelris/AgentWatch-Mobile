export type AgentState = 'DRAFT' | 'DEPLOYED' | 'ACTIVE' | 'PAUSED' | 'DEPRECATED' | 'DELETED';

export interface Agent {
  id: string;
  name: string;
  description: string;
  state: AgentState;
  health: 'healthy' | 'unhealthy' | 'unknown';
  createdAt: string;
}
