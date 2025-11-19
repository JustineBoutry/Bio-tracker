import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useExperiment } from "../components/ExperimentContext";

export default function DataEntry() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const selectedExp = activeExperimentId;
  const [categoryFilters, setCategoryFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [offspringCounts, setOffspringCounts] = useState({});
  const [showOffspringEntry, setShowOffspringEntry] = useState(false);
  
  const [nonInfectedIds, setNonInfectedIds] = useState('');
  const [infectedIds, setInfectedIds] = useState('');
  const [showSporeEntry, setShowSporeEntry] = useState(false);
  const [sporeData, setSporeData] = useState({});

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExp],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExp });
      return exps[0];
    },
    enabled: !!selectedExp,
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp, categoryFilters],
    queryFn: async () => {
      let query = { experiment_id: selectedExp, alive: true };
      Object.entries(categoryFilters).forEach(([key, value]) => {
        if (value !== 'all') {
          query[`factors.${key}`] = value;
        }
      });
      return base44.entities.Individual.filter(query);
    },
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

  const rednessMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        const ind = individuals.find(i => i.id === id);
        const newCount = (ind.red_signal_count || 0) + 1;
        await base44.entities.Individual.update(id, {
          red_signal_count: newCount,
          red_confirmed: newCount >= 3
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setSelectedIds([]);
      alert('Red signals recorded!');
    },
  });

  const markNonInfectedMutation = useMutation({
    mutationFn: async () => {
      const ids = nonInfectedIds.split(/[\s,]+/).filter(id => id.trim());
      for (const individualId of ids) {
        const inds = await base44.entities.Individual.filter({ 
          experiment_id: selectedExp,
          individual_id: individualId.trim()
        });
        if (inds.length > 0) {
          await base44.entities.Individual.update(inds[0].id, {
            infected: false,
            spores_count: null,
            spores_volume: null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setNonInfectedIds('');
      alert('Marked as non-infected!');
    },
  });

  const parseInfectedIds = () => {
    const ids = infectedIds.split(/[\s,]+/).filter(id => id.trim());
    const data = {};
    ids.forEach(id => {
      data[id.trim()] = { volume: '', count: '' };
    });
    setSporeData(data);
    setShowSporeEntry(true);
  };

  const saveInfectedMutation = useMutation({
    mutationFn: async () => {
      for (const [individualId, data] of Object.entries(sporeData)) {
        const inds = await base44.entities.Individual.filter({ 
          experiment_id: selectedExp,
          individual_id: individualId
        });
        if (inds.length > 0) {
          await base44.entities.Individual.update(inds[0].id, {
            infected: true,
            spores_volume: data.volume,
            spores_count: parseFloat(data.count) || 0
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setInfectedIds('');
      setSporeData({});
      setShowSporeEntry(false);
      alert('Infection data saved!');
    },
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateCategoryFilter = (factor, value) => {
    setCategoryFilters({ ...categoryFilters, [factor]: value });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Entry</h1>

      {selectedExp && experiment?.factors && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {experiment.factors.map((factor) => (
                <div key={factor.name}>
                  <label className="text-sm font-medium">{factor.name}</label>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={categoryFilters[factor.name] || 'all'}
                    onChange={(e) => updateCategoryFilter(factor.name, e.target.value)}
                  >
                    <option value="all">All</option>
                    {factor.levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedExp && (
        <Tabs defaultValue="reproduction">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reproduction">Reproduction</TabsTrigger>
            <TabsTrigger value="death">Death</TabsTrigger>
            <TabsTrigger value="redness">Redness</TabsTrigger>
            <TabsTrigger value="infection">Infection</TabsTrigger>
          </TabsList>

          <TabsContent value="reproduction">
            {!showOffspringEntry ? (
              <Card>
                <CardHeader>
                  <CardTitle>Select individuals that reproduced today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm text-gray-600">
                    {individuals.length} individuals | {selectedIds.length} selected
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
                    onClick={() => {
                      setShowOffspringEntry(true);
                      const counts = {};
                      selectedIds.forEach(id => counts[id] = 0);
                      setOffspringCounts(counts);
                    }}
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
                          <span className="font-mono w-40">{ind.individual_id}</span>
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
                    <Button onClick={() => reproductionMutation.mutate()}>
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
                  {individuals.length} individuals | {selectedIds.length} selected
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
                  disabled={selectedIds.length === 0}
                >
                  Mark as dead
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redness">
            <Card>
              <CardHeader>
                <CardTitle>Select individuals that look red today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-sm text-gray-600">
                  {individuals.length} individuals | {selectedIds.length} selected
                </div>
                <div className="space-y-2 max-h-96 overflow-auto mb-4">
                  {individuals.map((ind) => (
                    <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                        checked={selectedIds.includes(ind.id)}
                        onCheckedChange={() => toggleSelection(ind.id)}
                      />
                      <span className="font-mono flex-1">{ind.individual_id}</span>
                      <span className="text-sm text-gray-600">
                        Signals: {ind.red_signal_count || 0}
                        {ind.red_confirmed && ' ✓ Confirmed'}
                      </span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => rednessMutation.mutate()}
                  disabled={selectedIds.length === 0}
                >
                  Mark red signal (+1)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infection">
            <Card>
              <CardHeader>
                <CardTitle>Infection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Mark as NOT Infected</h3>
                  <Textarea
                    placeholder="Enter individual codes (comma or space separated)"
                    value={nonInfectedIds}
                    onChange={(e) => setNonInfectedIds(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    className="mt-2"
                    onClick={() => markNonInfectedMutation.mutate()}
                    disabled={!nonInfectedIds.trim()}
                  >
                    Mark as Non-Infected
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-2">Mark as Infected + Enter Spores</h3>
                  {!showSporeEntry ? (
                    <>
                      <Textarea
                        placeholder="Enter infected individual codes (comma or space separated)"
                        value={infectedIds}
                        onChange={(e) => setInfectedIds(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        className="mt-2"
                        onClick={parseInfectedIds}
                        disabled={!infectedIds.trim()}
                      >
                        Enter Spore Data
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-96 overflow-auto mb-4">
                        {Object.keys(sporeData).map((individualId) => (
                          <div key={individualId} className="border p-3 rounded space-y-2">
                            <div className="font-mono font-semibold">{individualId}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm">Spore Volume</label>
                                <Input
                                  placeholder="e.g., 10µL"
                                  value={sporeData[individualId].volume}
                                  onChange={(e) => setSporeData({
                                    ...sporeData,
                                    [individualId]: { ...sporeData[individualId], volume: e.target.value }
                                  })}
                                />
                              </div>
                              <div>
                                <label className="text-sm">Spore Count</label>
                                <Input
                                  type="number"
                                  placeholder="Count"
                                  value={sporeData[individualId].count}
                                  onChange={(e) => setSporeData({
                                    ...sporeData,
                                    [individualId]: { ...sporeData[individualId], count: e.target.value }
                                  })}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => saveInfectedMutation.mutate()}>
                          Save Infection Data
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowSporeEntry(false);
                            setInfectedIds('');
                            setSporeData({});
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}