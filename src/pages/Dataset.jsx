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
      setEditValues({});
    },
  });

  const startEdit = (ind) => {
    setEditingId(ind.id);
    setEditValues({
      alive: ind.alive,
      first_reproduction_date: ind.first_reproduction_date || '',
      last_reproduction_date: ind.last_reproduction_date || '',
      cumulative_offspring: ind.cumulative_offspring || 0,
      death_date: ind.death_date || ''
    });
  };

  const saveEdit = (ind) => {
    updateMutation.mutate({ id: ind.id, data: editValues });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dataset</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {selectedExp && (
        <Card>
          <CardHeader>
            <CardTitle>Individuals ({individuals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Alive</th>
                    <th className="p-2 text-left">First Reproduction</th>
                    <th className="p-2 text-left">Last Reproduction</th>
                    <th className="p-2 text-left">Cumulative Offspring</th>
                    <th className="p-2 text-left">Death Date</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {individuals.map((ind) => (
                    <tr key={ind.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono">{ind.individual_id}</td>
                      
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
                              value={editValues.first_reproduction_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, first_reproduction_date: e.target.value })
                              }
                              className="w-36"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={editValues.last_reproduction_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, last_reproduction_date: e.target.value })
                              }
                              className="w-36"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={editValues.cumulative_offspring}
                              onChange={(e) => 
                                setEditValues({ ...editValues, cumulative_offspring: parseInt(e.target.value) || 0 })
                              }
                              className="w-24"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="date"
                              value={editValues.death_date}
                              onChange={(e) => 
                                setEditValues({ ...editValues, death_date: e.target.value })
                              }
                              className="w-36"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEdit(ind)}>
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
                          <td className="p-2">{ind.first_reproduction_date || '-'}</td>
                          <td className="p-2">{ind.last_reproduction_date || '-'}</td>
                          <td className="p-2">{ind.cumulative_offspring || 0}</td>
                          <td className="p-2">{ind.death_date || '-'}</td>
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