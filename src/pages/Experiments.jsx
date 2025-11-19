import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Experiments() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [selectedExp, setSelectedExp] = useState(null);
  const [numIndividuals, setNumIndividuals] = useState(60);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExp }),
    enabled: !!selectedExp,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Experiment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['experiments']);
      setName("");
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const startNum = individuals.length + 1;
      const newIndividuals = [];
      
      for (let i = 0; i < numIndividuals; i++) {
        const code = `I${String(startNum + i).padStart(3, '0')}`;
        newIndividuals.push({
          individual_id: code,
          experiment_id: selectedExp,
          alive: true,
          cumulative_offspring: 0,
          first_reproduction_date: null,
          last_reproduction_date: null,
          death_date: null
        });
      }
      
      await base44.entities.Individual.bulkCreate(newIndividuals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      alert('Individuals generated!');
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Experiments</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Experiment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={() => createMutation.mutate({ 
              experiment_name: name,
              start_date: new Date().toISOString().split('T')[0]
            })}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Individuals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Experiment</label>
            <select 
              className="w-full border rounded p-2"
              value={selectedExp || ''}
              onChange={(e) => setSelectedExp(e.target.value)}
            >
              <option value="">Choose experiment...</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.experiment_name}
                </option>
              ))}
            </select>
          </div>
          
          {selectedExp && (
            <>
              <p className="text-sm text-gray-600">
                Current individuals: {individuals.length}
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block">Number of individuals to create</label>
                <Input
                  type="number"
                  value={numIndividuals}
                  onChange={(e) => setNumIndividuals(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                Generate Individuals
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="font-bold mb-2">All Experiments</h2>
        {experiments.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <CardTitle>{exp.experiment_name}</CardTitle>
              <p className="text-sm text-gray-600">Started: {exp.start_date}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}