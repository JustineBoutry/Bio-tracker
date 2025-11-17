import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Skull, Droplet, Syringe } from "lucide-react";

import ExperimentSelector from "../components/data-entry/ExperimentSelector";
import ReproductionEntry from "../components/data-entry/ReproductionEntry";
import DeathEntry from "../components/data-entry/DeathEntry";
import RednessEntry from "../components/data-entry/RednessEntry";
import InfectionEntry from "../components/data-entry/InfectionEntry";

const entryTypes = [
  { id: 'reproduction', title: 'Reproduction Events', icon: Baby, color: 'from-green-500 to-green-600', description: 'Record offspring counts' },
  { id: 'death', title: 'Deaths', icon: Skull, color: 'from-slate-500 to-slate-600', description: 'Mark deceased individuals' },
  { id: 'redness', title: 'Red Individuals', icon: Droplet, color: 'from-red-500 to-red-600', description: 'Record redness signals' },
  { id: 'infection', title: 'Infection & Spores', icon: Syringe, color: 'from-purple-500 to-purple-600', description: 'Update infection status' },
];

export default function DataEntry() {
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const renderEntryComponent = () => {
    if (!selectedExperiment || !selectedType) return null;

    switch (selectedType) {
      case 'reproduction':
        return <ReproductionEntry experimentId={selectedExperiment} onComplete={() => setSelectedType(null)} />;
      case 'death':
        return <DeathEntry experimentId={selectedExperiment} onComplete={() => setSelectedType(null)} />;
      case 'redness':
        return <RednessEntry experimentId={selectedExperiment} onComplete={() => setSelectedType(null)} />;
      case 'infection':
        return <InfectionEntry experimentId={selectedExperiment} onComplete={() => setSelectedType(null)} />;
      default:
        return null;
    }
  };

  if (selectedType) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {renderEntryComponent()}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Data Entry</h1>
        <p className="text-slate-600">Record measurements and events in batch mode</p>
      </div>

      <ExperimentSelector
        experiments={experiments}
        selectedExperiment={selectedExperiment}
        onSelect={setSelectedExperiment}
      />

      {selectedExperiment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {entryTypes.map((type) => (
            <Card
              key={type.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-200 bg-white/80 backdrop-blur-sm group"
              onClick={() => setSelectedType(type.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{type.title}</div>
                    <div className="text-sm text-slate-500 font-normal">{type.description}</div>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}