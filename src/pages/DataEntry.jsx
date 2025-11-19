import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataEntry() {
  const queryClient = useQueryClient();
  const [selectedExp, setSelectedExp] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [offspringCounts, setOffspringCounts] = useState({});
  const [showOffspringEntry, setShowOffspringEntry] = useState(false);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ 
      experiment_id: selectedExp,
      alive: true 
    }),
    enabled: !!selectedExp,
  });

  const reproductionMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      for (const id of selectedIds) {
        const ind = individuals.find(i => i.id === id);
        const offspring = offspringCounts[id] || 0;
        
        await base44.entities.ReproductionEvent.create({
          experiment_id: selectedExp,
          individual_id: ind.individual_id,
          event_date: today,
          offspring_count: offspring
        });
        
        await base44.entities.Individual.update(id, {
          first_reproduction_date: ind.first_reproduction_date || today,
          last_reproduction_date: today,
          cumulative_offspring: (ind.cumulative_offspring || 0) + offspring
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setSelectedIds([]);
      setOffspringCounts({});
      setShowOffspringEntry(false);
      alert('Reproduction recorded!');
    },
  });

  const deathMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      for (const id of selectedIds) {
        await base44.entities.Individual.update(id, {
          alive: false,
          death_date: today
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setSelectedIds([]);
      alert('Deaths recorded!');
    },
  });

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleEnterOffspring = () => {
    setShowOffspringEntry(true);
    const counts = {};
    selectedIds.forEach(id => counts[id] = 0);
    setOffspringCounts(counts);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Data Entry</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            className="w-full border rounded p-2"
            value={selectedExp || ''}
            onChange={(e) => {
              setSelectedExp(e.target.value);
              setSelectedIds([]);
              setShowOffspringEntry(false);
            }}
          >
            <option value="">Choose experiment...</option>
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.experiment_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedExp && (
        <Tabs defaultValue="reproduction">
          <TabsList>
            <TabsTrigger value="reproduction">Reproduction</TabsTrigger>
            <TabsTrigger value="death">Death</TabsTrigger>
          </TabsList>

          <TabsContent value="reproduction">
            {!showOffspringEntry ? (
              <Card>
                <CardHeader>
                  <CardTitle>Select individuals that reproduced today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {individuals.length} alive individuals | {selectedIds.length} selected
                  </div>
                  <div className="space-y-2 max-h-96 overflow-auto mb-4">
                    {individuals.map((ind) => (
                      <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                        <Checkbox
                          checked={selectedIds.includes(ind.id)}
                          onCheckedChange={() => toggleSelection(ind.id)}
                        />
                        <span className="font-mono">{ind.individual_id}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={handleEnterOffspring}
                    disabled={selectedIds.length === 0}
                  >
                    Enter offspring counts
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Enter offspring counts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-auto mb-4">
                    {selectedIds.map((id) => {
                      const ind = individuals.find(i => i.id === id);
                      return (
                        <div key={id} className="flex items-center gap-3 p-2 border rounded">
                          <span className="font-mono w-24">{ind.individual_id}</span>
                          <Input
                            type="number"
                            min="0"
                            value={offspringCounts[id] || 0}
                            onChange={(e) => setOffspringCounts({
                              ...offspringCounts,
                              [id]: parseInt(e.target.value) || 0
                            })}
                            className="w-32"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => reproductionMutation.mutate()}
                      disabled={reproductionMutation.isPending}
                    >
                      Submit
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowOffspringEntry(false);
                        setSelectedIds([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="death">
            <Card>
              <CardHeader>
                <CardTitle>Select individuals that died today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {individuals.length} alive individuals | {selectedIds.length} selected
                </div>
                <div className="space-y-2 max-h-96 overflow-auto mb-4">
                  {individuals.map((ind) => (
                    <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                        checked={selectedIds.includes(ind.id)}
                        onCheckedChange={() => toggleSelection(ind.id)}
                      />
                      <span className="font-mono">{ind.individual_id}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => deathMutation.mutate()}
                  disabled={selectedIds.length === 0 || deathMutation.isPending}
                >
                  Mark as dead
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}