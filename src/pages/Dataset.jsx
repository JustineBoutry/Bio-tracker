import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export default function Dataset() {
  const queryClient = useQueryClient();
  const [selectedExp, setSelectedExp] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
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
    },
  });

  const startEdit = (ind) => {
    setEditingId(ind.id);
    setEditValues({
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

  const exportCSV = () => {
    if (individuals.length === 0) return;
    
    const headers = ['Code', 'Alive', 'Death Date', 'First Reproduction', 'Last Reproduction', 
                     'Cumulative Offspring', 'Infected', 'Spores Count', 'Spores Volume', 
                     'Red Signal Count', 'Red Confirmed'];
    
    const factorKeys = individuals[0]?.factors ? Object.keys(individuals[0].factors) : [];
    const allHeaders = [...factorKeys, ...headers];
    
    const rows = individuals.map(ind => {
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
        </CardContent>
      </Card>

      {selectedExp && (
        <Card>
          <CardHeader>
            <CardTitle>Individuals ({individuals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left sticky left-0 bg-gray-50">Code</th>
                    {individuals[0]?.factors && Object.keys(individuals[0].factors).map(factor => (
                      <th key={factor} className="p-2 text-left">{factor}</th>
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
                  {individuals.map((ind) => (
                    <tr key={ind.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono sticky left-0 bg-white">{ind.individual_id}</td>
                      {ind.factors && Object.values(ind.factors).map((val, i) => (
                        <td key={i} className="p-2">{val}</td>
                      ))}
                      
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
                              <Button size="sm" onClick={() => updateMutation.mutate({ id: ind.id, data: editValues })}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
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
                            <Button size="sm" variant="outline" onClick={() => startEdit(ind)}>
                              Edit
                            </Button>
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