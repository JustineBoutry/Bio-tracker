import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Subscribes to Individual entity changes and invalidates the individuals query
 * for the given experimentId so the dashboard stays in sync with the dataset.
 */
export function useIndividualsSync(experimentId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!experimentId) return;
    const unsubscribe = base44.entities.Individual.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['individuals', experimentId] });
    });
    return unsubscribe;
  }, [experimentId, queryClient]);
}