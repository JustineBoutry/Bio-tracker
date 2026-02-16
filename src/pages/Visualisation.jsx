import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useExperiment } from "../components/ExperimentContext";
import CustomGraphic from "../components/dashboard/CustomGraphic";
import { useTranslation } from 'react-i18next';

export default function Visualisation() {
  const { t } = useTranslation();
  const { activeExperimentId } = useExperiment();
  
  const { data: experiment } = useQuery({
    queryKey: ['experiment', activeExperimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: activeExperimentId });
      return exps[0];
    },
    enabled: !!activeExperimentId,
  });

  const { data: allIndividuals = [] } = useQuery({
    queryKey: ['individuals', activeExperimentId],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: activeExperimentId }),
    enabled: !!activeExperimentId,
  });

  if (!experiment) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Custom Visualizations</h1>
      <p className="text-gray-600 mb-6">Interactive graphics configured in the experiment setup</p>

      {experiment.dashboard_graphics && experiment.dashboard_graphics.length > 0 ? (
        <div className="space-y-6">
          {experiment.dashboard_graphics.map((graphic, index) => (
            <CustomGraphic 
              key={index} 
              graphic={graphic} 
              experiment={experiment}
              allIndividuals={allIndividuals}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-600">No custom visualizations configured yet.</p>
          <p className="text-sm text-gray-500 mt-2">Go to Setup to add custom visualizations.</p>
        </div>
      )}
    </div>
  );
}