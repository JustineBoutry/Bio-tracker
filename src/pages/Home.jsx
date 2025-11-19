import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useExperiment } from "../components/ExperimentContext";

export default function Home() {
  const navigate = useNavigate();
  const { selectExperiment } = useExperiment();
  const [selectedExp, setSelectedExp] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const enterExperiment = () => {
    if (selectedExp) {
      selectExperiment(selectedExp);
      navigate(createPageUrl("DataEntry"));
    }
  };

  const createExperiment = async () => {
    if (!name) return;
    const exp = await base44.entities.Experiment.create({
      experiment_name: name,
      start_date: startDate,
      individuals_generated: false,
      code_generation_mode: 'factor_based',
      code_prefix: 'ID-',
      code_starting_number: 1
    });
    selectExperiment(exp.id);
    navigate(createPageUrl("ExperimentSetup"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">BioTracker</h1>
          <p className="text-gray-600">Select or create an experiment to begin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Existing Experiment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select 
              className="w-full border rounded p-3"
              value={selectedExp || ''}
              onChange={(e) => setSelectedExp(e.target.value)}
            >
              <option value="">Choose experiment...</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.experiment_name} (Started: {exp.start_date})
                </option>
              ))}
            </select>
            <Button 
              className="w-full" 
              size="lg"
              onClick={enterExperiment}
              disabled={!selectedExp}
            >
              Enter this experiment
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500">or</div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Experiment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Experiment Name</label>
              <Input
                placeholder="Enter experiment name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              size="lg"
              onClick={createExperiment}
              disabled={!name}
            >
              Create new experiment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}