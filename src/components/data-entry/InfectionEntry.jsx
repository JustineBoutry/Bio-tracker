import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function InfectionEntry({ experimentId, onComplete, experiment }) {
  const queryClient = useQueryClient();
  const [nonInfectedIds, setNonInfectedIds] = useState('');
  const [infectedData, setInfectedData] = useState('');
  const [parsedInfected, setParsedInfected] = useState([]);
  const [parsedNonInfected, setParsedNonInfected] = useState([]);
  const [sporeData, setSporeData] = useState({});
  const [nonInfectedData, setNonInfectedData] = useState({});

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', experimentId],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: experimentId }),
  });

  const markNonInfectedMutation = useMutation({
    mutationFn: async () => {
      const alreadySet = [];
      
      for (const id of parsedNonInfected) {
        const individual = individuals.find(i => i.individual_id === id);
        if (individual && individual.infected !== "not_tested") {
          alreadySet.push({ id: individual.individual_id, status: individual.infected });
        }
      }

      if (alreadySet.length > 0) {
        const message = `The following individuals already have infection status:\n${alreadySet.map(i => `${i.id}: ${i.status}`).join('\n')}\n\nDo you want to update them?`;
        if (!window.confirm(message)) {
          throw new Error('Update cancelled by user');
        }
      }
      
      for (const id of parsedNonInfected) {
        const individual = individuals.find(i => i.individual_id === id);
        if (individual) {
          const updateData = {
            infected: false,
            spores_count: null,
            spores_volume: null
          };
          
          if (nonInfectedData[id]?.customTraits && Object.keys(nonInfectedData[id].customTraits).length > 0) {
            const currentCustomData = individual.custom_data || {};
            updateData.custom_data = { ...currentCustomData, ...nonInfectedData[id].customTraits };
          }
          
          await base44.entities.Individual.update(individual.id, updateData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      alert('Non-infected individuals updated');
      setNonInfectedIds('');
      setParsedNonInfected([]);
      setNonInfectedData({});
    },
    onError: (error) => {
      if (error.message === 'Update cancelled by user') {
        return;
      }
      alert('Error: ' + error.message);
    }
  });

  const saveInfectedMutation = useMutation({
    mutationFn: async () => {
      const alreadySet = [];
      
      // Check for existing infection status
      for (const id of parsedInfected) {
        const individual = individuals.find(i => i.individual_id === id);
        if (individual && individual.infected !== "not_tested") {
          alreadySet.push({ id: individual.individual_id, status: individual.infected });
        }
      }

      if (alreadySet.length > 0) {
        const message = `The following individuals already have infection status:\n${alreadySet.map(i => `${i.id}: ${i.status}`).join('\n')}\n\nDo you want to update them?`;
        if (!window.confirm(message)) {
          throw new Error('Update cancelled by user');
        }
      }

      for (const id of parsedInfected) {
        const individual = individuals.find(i => i.individual_id === id);
        if (individual) {
          const updateData = {
            infected: true,
            spores_count: sporeData[id]?.count || null,
            spores_volume: sporeData[id]?.volume || null
          };
          
          if (sporeData[id]?.customTraits && Object.keys(sporeData[id].customTraits).length > 0) {
            const currentCustomData = individual.custom_data || {};
            updateData.custom_data = { ...currentCustomData, ...sporeData[id].customTraits };
          }
          
          await base44.entities.Individual.update(individual.id, updateData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      alert('Infected individuals updated');
      setInfectedData('');
      setParsedInfected([]);
      setSporeData({});
    },
    onError: (error) => {
      if (error.message === 'Update cancelled by user') {
        return;
      }
      alert('Error: ' + error.message);
    }
  });

  const parseInfectedIds = () => {
    const ids = infectedData.split(/[\n,\s]+/).filter(id => id.trim());
    setParsedInfected(ids.map(id => id.trim()));
    
    const initialSporeData = {};
    const infectionTraits = (experiment?.custom_traits || []).filter(t => t.tab === 'infection' && (t.modality === 'infected' || t.modality === 'all'));
    ids.forEach(id => {
      const trimmedId = id.trim();
      const traitDefaults = {};
      infectionTraits.forEach(trait => {
        if (trait.type === 'boolean') {
          traitDefaults[trait.name] = 'no';
        }
      });
      initialSporeData[trimmedId] = { 
        volume: '', 
        count: '',
        customTraits: Object.keys(traitDefaults).length > 0 ? traitDefaults : {}
      };
    });
    setSporeData(initialSporeData);
  };

  const updateSporeData = (id, field, value) => {
    setSporeData({
      ...sporeData,
      [id]: {
        ...sporeData[id],
        [field]: value
      }
    });
  };

  const parseNonInfectedIds = () => {
    const ids = nonInfectedIds.split(/[\n,\s]+/).filter(id => id.trim());
    setParsedNonInfected(ids.map(id => id.trim()));
    
    const initialData = {};
    const nonInfectedTraits = (experiment?.custom_traits || []).filter(t => 
      t.tab === 'infection' && (t.modality === 'non_infected' || t.modality === 'all')
    );
    ids.forEach(id => {
      const trimmedId = id.trim();
      const traitDefaults = {};
      nonInfectedTraits.forEach(trait => {
        if (trait.type === 'boolean') {
          traitDefaults[trait.name] = 'no';
        }
      });
      if (Object.keys(traitDefaults).length > 0) {
        initialData[trimmedId] = { customTraits: traitDefaults };
      }
    });
    setNonInfectedData(initialData);
  };

  const updateNonInfectedData = (id, field, value) => {
    setNonInfectedData({
      ...nonInfectedData,
      [id]: {
        ...nonInfectedData[id],
        [field]: value
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onComplete}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Infection & Spore Entry</h2>
          <p className="text-slate-600">Update infection status and spore counts</p>
        </div>
      </div>

      <Tabs defaultValue="infected" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="infected">Mark Infected</TabsTrigger>
          <TabsTrigger value="non-infected">Mark Non-Infected</TabsTrigger>
        </TabsList>

        <TabsContent value="infected">
          {parsedInfected.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Enter Infected Individual IDs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Individual IDs (one per line, comma or space separated)
                  </label>
                  <Textarea
                    value={infectedData}
                    onChange={(e) => setInfectedData(e.target.value)}
                    placeholder="IND_0001&#10;IND_0002&#10;IND_0003"
                    rows={8}
                  />
                </div>

                <Button
                  onClick={parseInfectedIds}
                  disabled={!infectedData.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Enter Spore Data</span>
                  <Button variant="outline" size="sm" onClick={() => {
                    setParsedInfected([]);
                    setSporeData({});
                  }}>
                    Change IDs
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-auto mb-4">
                  {parsedInfected.map((id) => {
                    const ind = individuals.find(i => i.individual_id === id);
                    return (
                      <div key={id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold">{id}</span>
                          {ind && (
                            <div className="flex gap-1">
                              {Object.entries(ind.factors).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="text-xs">
                                  {k}: {v}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Spores Volume</label>
                            <Input
                              value={sporeData[id]?.volume || ''}
                              onChange={(e) => updateSporeData(id, 'volume', e.target.value)}
                              placeholder="e.g., 10µL"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Spores Count</label>
                            <Input
                              type="number"
                              value={sporeData[id]?.count || ''}
                              onChange={(e) => updateSporeData(id, 'count', parseFloat(e.target.value))}
                              placeholder="Count"
                            />
                          </div>
                          {(experiment?.custom_traits || [])
                            .filter(trait => trait.tab === 'infection' && (trait.modality === 'infected' || trait.modality === 'all'))
                            .map((trait) => (
                              <div key={`${id}-${trait.name}`}>
                                <label className="block text-xs font-medium mb-1">{trait.name}</label>
                                {trait.type === 'boolean' ? (
                                  <div className="flex items-center gap-2 h-9">
                                    <Checkbox
                                      id={`${id}-${trait.name}`}
                                      checked={(sporeData[id]?.customTraits?.[trait.name] || 'no') === 'yes'}
                                      onCheckedChange={(checked) => {
                                        const currentTraits = sporeData[id]?.customTraits || {};
                                        updateSporeData(id, 'customTraits', {
                                          ...currentTraits,
                                          [trait.name]: checked ? 'yes' : 'no'
                                        });
                                      }}
                                    />
                                    <span className="text-xs text-gray-600">
                                      {(sporeData[id]?.customTraits?.[trait.name] || 'no') === 'yes' ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                ) : trait.type === 'number' ? (
                                  <Input
                                    type="number"
                                    value={sporeData[id]?.customTraits?.[trait.name] || ''}
                                    onChange={(e) => {
                                      const currentTraits = sporeData[id]?.customTraits || {};
                                      updateSporeData(id, 'customTraits', {
                                        ...currentTraits,
                                        [trait.name]: parseFloat(e.target.value) || null
                                      });
                                    }}
                                    placeholder={`Enter ${trait.name}`}
                                    className="h-9"
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={sporeData[id]?.customTraits?.[trait.name] || ''}
                                    onChange={(e) => {
                                      const currentTraits = sporeData[id]?.customTraits || {};
                                      updateSporeData(id, 'customTraits', {
                                        ...currentTraits,
                                        [trait.name]: e.target.value
                                      });
                                    }}
                                    placeholder={`Enter ${trait.name}`}
                                    className="h-9"
                                  />
                                )}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>

                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => saveInfectedMutation.mutate()}
                            disabled={saveInfectedMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saveInfectedMutation.isPending ? 'Saving...' : `Save ${parsedInfected.length} Infected Individuals`}
                          </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="non-infected">
          {parsedNonInfected.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Mark Non-Infected Individuals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Individual IDs (one per line, comma or space separated)
                  </label>
                  <Textarea
                    value={nonInfectedIds}
                    onChange={(e) => setNonInfectedIds(e.target.value)}
                    placeholder="IND_0001&#10;IND_0002&#10;IND_0003"
                    rows={8}
                  />
                </div>

                <Button
                  onClick={parseNonInfectedIds}
                  disabled={!nonInfectedIds.trim()}
                  className="w-full bg-slate-600 hover:bg-slate-700"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Non-Infected Individual Data</span>
                  <Button variant="outline" size="sm" onClick={() => {
                    setParsedNonInfected([]);
                    setNonInfectedData({});
                  }}>
                    Change IDs
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-auto mb-4">
                  {parsedNonInfected.map((id) => {
                    const ind = individuals.find(i => i.individual_id === id);
                    const nonInfectedTraits = (experiment?.custom_traits || []).filter(t => 
                      t.tab === 'infection' && (t.modality === 'non_infected' || t.modality === 'all')
                    );
                    
                    return (
                      <div key={id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold">{id}</span>
                          {ind && (
                            <div className="flex gap-1">
                              {Object.entries(ind.factors).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="text-xs">
                                  {k}: {v}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {nonInfectedTraits.length > 0 && (
                          <div className="grid grid-cols-3 gap-3">
                            {nonInfectedTraits.map((trait) => (
                              <div key={`${id}-${trait.name}`}>
                                <label className="block text-xs font-medium mb-1">{trait.name}</label>
                                {trait.type === 'boolean' ? (
                                  <div className="flex items-center gap-2 h-9">
                                    <Checkbox
                                      id={`${id}-${trait.name}`}
                                      checked={(nonInfectedData[id]?.customTraits?.[trait.name] || 'no') === 'yes'}
                                      onCheckedChange={(checked) => {
                                        const currentTraits = nonInfectedData[id]?.customTraits || {};
                                        updateNonInfectedData(id, 'customTraits', {
                                          ...currentTraits,
                                          [trait.name]: checked ? 'yes' : 'no'
                                        });
                                      }}
                                    />
                                    <span className="text-xs text-gray-600">
                                      {(nonInfectedData[id]?.customTraits?.[trait.name] || 'no') === 'yes' ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                ) : trait.type === 'number' ? (
                                  <Input
                                    type="number"
                                    value={nonInfectedData[id]?.customTraits?.[trait.name] || ''}
                                    onChange={(e) => {
                                      const currentTraits = nonInfectedData[id]?.customTraits || {};
                                      updateNonInfectedData(id, 'customTraits', {
                                        ...currentTraits,
                                        [trait.name]: parseFloat(e.target.value) || null
                                      });
                                    }}
                                    placeholder={`Enter ${trait.name}`}
                                    className="h-9"
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={nonInfectedData[id]?.customTraits?.[trait.name] || ''}
                                    onChange={(e) => {
                                      const currentTraits = nonInfectedData[id]?.customTraits || {};
                                      updateNonInfectedData(id, 'customTraits', {
                                        ...currentTraits,
                                        [trait.name]: e.target.value
                                      });
                                    }}
                                    placeholder={`Enter ${trait.name}`}
                                    className="h-9"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button
                  className="w-full bg-slate-600 hover:bg-slate-700"
                  onClick={() => markNonInfectedMutation.mutate()}
                  disabled={markNonInfectedMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {markNonInfectedMutation.isPending ? 'Saving...' : `Save ${parsedNonInfected.length} Non-Infected Individuals`}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}