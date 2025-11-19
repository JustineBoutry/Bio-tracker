import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function Dataset() {
  const queryClient = useQueryClient();
  const [selectedExp, setSelectedExp] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [codeError, setCodeError] = useState(null);
  const [factorFilters, setFactorFilters] = useState({});

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExp],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExp });
      return exps[0];
    },
    enabled: !!selectedExp,
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExp }),
    enabled: !!selectedExp,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Individual.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      setEditingId(null);
      setCodeError(null);
    },
  });

  const addIndividualMutation = useMutation({
    mutationFn: async () => {
      const exp = await base44.entities.Experiment.filter({ id: selectedExp });
      const currentExperiment = exp[0];
      
      let newCode;
      if (currentExperiment.code_generation_mode === 'numeric_id') {
        const allInds = await base44.entities.Individual.filter({ experiment_id: selectedExp });
        const prefix = currentExperiment.code_prefix || 'ID-';
        const existingNumbers = allInds
          .map(ind => ind.individual_id)
          .filter(id => id.startsWith(prefix))
          .map(id => parseInt(id.replace(prefix, '')))
          .filter(num => !isNaN(num));
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : (currentExperiment.code_starting_number || 1) - 1;
        newCode = `${prefix}${maxNumber + 1}`;
      } else {
        const allInds = await base44.entities.Individual.filter({ experiment_id: selectedExp });
        newCode = `IND-${String(allInds.length + 1).padStart(4, '0')}`;
      }
      
      return base44.entities.Individual.create({
        individual_id: newCode,
        experiment_id: selectedExp,
        factors: {},
        alive: true,
        infected: false,
        red_signal_count: 0,
        red_confirmed: false,
        cumulative_offspring: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      alert('Individual added!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const ind = individuals.find(i => i.id === id);
      const events = await base44.entities.ReproductionEvent.filter({ individual_id: ind.individual_id });
      for (const event of events) {
        await base44.entities.ReproductionEvent.delete(event.id);
      }
      await base44.entities.Individual.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['individuals']);
      alert('Individual deleted!');
    },
  });

  const startEdit = (ind) => {
    setEditingId(ind.id);
    setCodeError(null);
    setEditValues({
      individual_id: ind.individual_id,
      factors: ind.factors || {},
      alive: ind.alive,
      first_reproduction_date: ind.first_reproduction_date || '',
      last_reproduction_date: ind.last_reproduction_date || '',
      cumulative_offspring: ind.cumulative_offspring || 0,
      death_date: ind.death_date || '',
      infected: ind.infected || false,
      spores_count: ind.spores_count || '',
      spores_volume: ind.spores_volume || '',
      red_signal_count: ind.red_signal_count || 0,
      red_confirmed: ind.red_confirmed || false
    });
  };

  const handleSave = async (ind) => {
    if (editValues.individual_id !== ind.individual_id) {
      const duplicate = individuals.find(i => 
        i.id !== ind.id && i.individual_id === editValues.individual_id
      );
      if (duplicate) {
        setCodeError('Code must be unique within this experiment');
        return;
      }
    }
    updateMutation.mutate({ id: ind.id, data: editValues });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this individual? This will also delete all associated reproduction events.')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredIndividuals = individuals.filter(ind => {
    return Object.entries(factorFilters).every(([factorName, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      const indValue = ind.factors?.[factorName];
      return selectedValues.includes(indValue);
    });
  });

  const exportCSV = () => {
    if (filteredIndividuals.length === 0) return;
    
    const headers = ['Code', 'Alive', 'Death Date', 'First Reproduction', 'Last Reproduction', 
                     'Cumulative Offspring', 'Infected', 'Spores Count', 'Spores Volume', 
                     'Red Signal Count', 'Red Confirmed'];
    
    const factorKeys = individuals[0]?.factors ? Object.keys(individuals[0].factors) : [];
    const allHeaders = [...factorKeys, ...headers];
    
    const rows = filteredIndividuals.map(ind => {
      const factorValues = factorKeys.map(k => ind.factors?.[k] || '');
      const values = [
        ind.individual_id,
        ind.alive ? 'Yes' : 'No',
        ind.death_date || '',
        ind.first_reproduction_date || '',
        ind.last_reproduction_date || '',
        ind.cumulative_offspring || 0,
        ind.infected ? 'Yes' : 'No',
        ind.spores_count || '',
        ind.spores_volume || '',
        ind.red_signal_count || 0,
        ind.red_confirmed ? 'Yes' : 'No'
      ];
      return [...factorValues, ...values];
    });
    
    const csv = [allHeaders, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset.csv';
    a.click();
  };

  return (
    <div className="p-8 max-w-full">
      <h1 className="text-3xl font-bold mb-6">Dataset</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <select 
            className="flex-1 border rounded p-2"
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
          <Button onClick={exportCSV} disabled={!selectedExp || individuals.length === 0}>
            Export CSV
          </Button>
          <Button onClick={() => addIndividualMutation.mutate()} disabled={!selectedExp}>
            <Plus className="w-4 h-4 mr-2" />
            Add Individual
          </Button>
        </CardContent>
      </Card>

      {selectedExp && experiment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {experiment.factors?.map(factor => {
                const uniqueLevels = [...new Set(
                  individuals.map(ind => ind.factors?.[factor.name]).filter(Boolean)
                )];

                return (
                  <div key={factor.name}>
                    <label className="text-sm font-medium block mb-1">{factor.name}</label>
                    <select
                      multiple
                      className="w-full border rounded p-2 text-sm"
                      size={Math.min(uniqueLevels.length + 1, 5)}
                      value={factorFilters[factor.name] || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFactorFilters({
                          ...factorFilters,
                          [factor.name]: selected.length === 0 ? [] : selected
                        });
                      }}
                    >
                      <option value="">All</option>
                      {uniqueLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      Hold Ctrl/Cmd to select multiple
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(factorFilters).some(k => factorFilters[k]?.length > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setFactorFilters({})}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {selectedExp && (
        <Card>
          <CardHeader>
            <CardTitle>Individuals ({filteredIndividuals.length} of {individuals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {codeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
                {codeError}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left sticky left-0 bg-gray-50">Code</th>
                    {experiment?.factors && experiment.factors.map(factor => (
                      <th key={factor.name} className="p-2 text-left">{factor.name}</th>
                    ))}
                    <th className="p-2 text-left">Alive</th>
                    <th className="p-2 text-left">Death Date</th>
                    <th className="p-2 text-left">First Repro</th>
                    <th className="p-2 text-left">Last Repro</th>
                    <th className="p-2 text-left">Offspring</th>
                    <th className="p-2 text-left">Infected</th>
                    <th className="p-2 text-left">Spores Count</th>
                    <th className="p-2 text-left">Spores Volume</th>
                    <th className="p-2 text-left">Red Signals</th>
                    <th className="p-2 text-left">Red Confirmed</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIndividuals.map((ind) => (
                    <tr key={ind.id} className="border-b hover:bg-gray-50">
                      {editingId === ind.id ? (
                        <>
                          <td className="p-2 sticky left-0 bg-white">
                            <Input
                              value={editValues.individual_id}
                              onChange={(e) => 
                                setEditValues({ ...editValues, individual_id: e.target.value })
                              }
                              className="w-32 font-mono"
                            />
                          </td>
                          {experiment?.factors && experiment.factors.map(factor => (
                            <td key={factor.name} className="p-2">
                              <select
                                className="w-full border rounded p-1"
                                value={editValues.factors[factor.name] || ''}
                                onChange={(e) => 
                                  setEditValues({ 
                                    ...editValues, 
                                    factors: { ...editValues.factors, [factor.name]: e.target.value }
                                  })
                                }
                              >
                                <option value="">-</option>
                                {factor.levels.map(level => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="p-2 font-mono sticky left-0 bg-white">{ind.individual_id}</td>
                          {experiment?.factors && experiment.factors.map(factor => (
                            <td key={factor.name} className="p-2">{ind.factors?.[factor.name] || '-'}</td>
                          ))}
                        </>
                      )}

                      {editingId === ind.id ? (
                        <>
                          <td className="p-2">
                            <Checkbox
                              checked={editValues.alive}
                              onCheckedChange={(checked) => 
                                setEditValues({ ...editValues, alive: checked })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={editValues.death_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, death_date: e.target.value })
                              }
                              className="w-32"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={editValues.first_reproduction_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, first_reproduction_date: e.target.value })
                              }
                              className="w-32"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={editValues.last_reproduction_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, last_reproduction_date: e.target.value })
                              }
                              className="w-32"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={editValues.cumulative_offspring}
                              onChange={(e) => 
                                setEditValues({ ...editValues, cumulative_offspring: parseInt(e.target.value) || 0 })
                              }
                              className="w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Checkbox
                              checked={editValues.infected}
                              onCheckedChange={(checked) => 
                                setEditValues({ ...editValues, infected: checked })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={editValues.spores_count}
                              onChange={(e) => 
                                setEditValues({ ...editValues, spores_count: e.target.value })
                              }
                              className="w-24"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={editValues.spores_volume}
                              onChange={(e) => 
                                setEditValues({ ...editValues, spores_volume: e.target.value })
                              }
                              className="w-24"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={editValues.red_signal_count}
                              onChange={(e) => 
                                setEditValues({ ...editValues, red_signal_count: parseInt(e.target.value) || 0 })
                              }
                              className="w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Checkbox
                              checked={editValues.red_confirmed}
                              onCheckedChange={(checked) => 
                                setEditValues({ ...editValues, red_confirmed: checked })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleSave(ind)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditingId(null);
                                setCodeError(null);
                              }}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2">{ind.alive ? 'Yes' : 'No'}</td>
                          <td className="p-2">{ind.death_date || '-'}</td>
                          <td className="p-2">{ind.first_reproduction_date || '-'}</td>
                          <td className="p-2">{ind.last_reproduction_date || '-'}</td>
                          <td className="p-2">{ind.cumulative_offspring || 0}</td>
                          <td className="p-2">{ind.infected ? 'Yes' : 'No'}</td>
                          <td className="p-2">{ind.spores_count || '-'}</td>
                          <td className="p-2">{ind.spores_volume || '-'}</td>
                          <td className="p-2">{ind.red_signal_count || 0}</td>
                          <td className="p-2">{ind.red_confirmed ? 'Yes' : 'No'}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => startEdit(ind)}>
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDelete(ind.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}