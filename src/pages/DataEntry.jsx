import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataEntry() {
  const queryClient = useQueryClient();
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [offspringCounts, setOffspringCounts] = useState({});

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExperiment],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExperiment, alive: true }),
    enabled: !!selectedExperiment,
  });

  const reproductionMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const events = selectedIndividuals.map(id => ({
        experiment_id: selectedExperiment,
        individual_id: id,
        event_date: today,
        offspring_count: offspringCounts[id] || 0
      }));

      await base44.entities.ReproductionEvent.bulkCreate(events);

      for (const id of selectedIndividuals) {
        const ind = individuals.find(i => i.individual_id === id);
        await base44.entities.Individual.update(ind.id, {
          first_reproduction_date: ind.first_reproduction_date || today,
          last_reproduction_date: today,
          cumulative_offspring: (ind.cumulative_offspring || 0) + (offspringCounts[id] || 0)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      setSelectedIndividuals([]);
      setOffspringCounts({});
      alert('Saved!');
    },
  });

  const deathMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      for (const id of selectedIndividuals) {
        const ind = individuals.find(i => i.individual_id === id);
        await base44.entities.Individual.update(ind.id, {
          alive: false,
          death_date: today
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      setSelectedIndividuals([]);
      alert('Saved!');
    },
  });

  const rednessMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIndividuals) {
        const ind = individuals.find(i => i.individual_id === id);
        const newCount = (ind.red_signals_count || 0) + 1;
        await base44.entities.Individual.update(ind.id, {
          red_signals_count: newCount,
          red_confirmed: newCount >= 3
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      setSelectedIndividuals([]);
      alert('Saved!');
    },
  });

  const toggleIndividual = (id) => {
    if (selectedIndividuals.includes(id)) {
      setSelectedIndividuals(selectedIndividuals.filter(i => i !== id));
    } else {
      setSelectedIndividuals([...selectedIndividuals, id]);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Data Entry</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedExperiment || ""} onValueChange={setSelectedExperiment}>
            <SelectTrigger>
              <SelectValue placeholder="Choose experiment..." />
            </SelectTrigger>
            <SelectContent>
              {experiments.map((exp) => (
                <SelectItem key={exp.id} value={exp.id}>
                  {exp.experiment_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedExperiment && (
        <Tabs defaultValue="reproduction">
          <TabsList className="mb-6">
            <TabsTrigger value="reproduction">Reproduction</TabsTrigger>
            <TabsTrigger value="death">Deaths</TabsTrigger>
            <TabsTrigger value="redness">Redness</TabsTrigger>
          </TabsList>

          <TabsContent value="reproduction">
            <Card>
              <CardHeader>
                <CardTitle>Record Reproduction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-96 overflow-auto space-y-2">
                  {individuals.map((ind) => (
                    <div key={ind.individual_id} className="flex items-center gap-4 p-3 border rounded">
                      <Checkbox
                        checked={selectedIndividuals.includes(ind.individual_id)}
                        onCheckedChange={() => toggleIndividual(ind.individual_id)}
                      />
                      <span className="font-mono flex-1">{ind.individual_id}</span>
                      {selectedIndividuals.includes(ind.individual_id) && (
                        <Input
                          type="number"
                          placeholder="Offspring"
                          className="w-32"
                          value={offspringCounts[ind.individual_id] || ''}
                          onChange={(e) => setOffspringCounts({
                            ...offspringCounts,
                            [ind.individual_id]: parseInt(e.target.value) || 0
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => reproductionMutation.mutate()}
                  disabled={selectedIndividuals.length === 0}
                  className="w-full"
                >
                  Save Reproduction Events
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="death">
            <Card>
              <CardHeader>
                <CardTitle>Mark Deaths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-96 overflow-auto space-y-2">
                  {individuals.map((ind) => (
                    <div key={ind.individual_id} className="flex items-center gap-4 p-3 border rounded">
                      <Checkbox
                        checked={selectedIndividuals.includes(ind.individual_id)}
                        onCheckedChange={() => toggleIndividual(ind.individual_id)}
                      />
                      <span className="font-mono">{ind.individual_id}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => deathMutation.mutate()}
                  disabled={selectedIndividuals.length === 0}
                  className="w-full"
                >
                  Mark as Deceased
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redness">
            <Card>
              <CardHeader>
                <CardTitle>Record Redness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-96 overflow-auto space-y-2">
                  {individuals.map((ind) => (
                    <div key={ind.individual_id} className="flex items-center gap-4 p-3 border rounded">
                      <Checkbox
                        checked={selectedIndividuals.includes(ind.individual_id)}
                        onCheckedChange={() => toggleIndividual(ind.individual_id)}
                      />
                      <span className="font-mono flex-1">{ind.individual_id}</span>
                      {ind.red_signals_count > 0 && (
                        <span className="text-sm">
                          {ind.red_signals_count} signals {ind.red_confirmed && '✓'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => rednessMutation.mutate()}
                  disabled={selectedIndividuals.length === 0}
                  className="w-full"
                >
                  Add Red Signal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}