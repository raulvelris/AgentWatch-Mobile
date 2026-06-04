import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentRepository } from '../repositories/AgentRepository';
import { Agent } from '../models/Agent';

export function useAgentViewModel() {
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: () => AgentRepository.getAgents(),
  });

  const toggleStateMutation = useMutation({
    mutationFn: ({ id, currentState }: { id: string, currentState: Agent['state'] }) => {
      const newState = currentState === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      return AgentRepository.updateAgentState(id, newState);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });

  const getAgentById = (id: string) => {
    return agents.find(a => a.id === id);
  };

  return {
    agents,
    isLoading,
    error,
    getAgentById,
    toggleAgentState: (id: string, currentState: Agent['state']) => 
      toggleStateMutation.mutate({ id, currentState }),
    isUpdating: toggleStateMutation.isPending,
  };
}
