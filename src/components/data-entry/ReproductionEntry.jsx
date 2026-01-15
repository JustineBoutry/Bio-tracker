import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import CategorySelector from "./CategorySelector";

export default function ReproductionEntry({ experimentId, onComplete }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({});
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [offspringCounts, setOffspringCounts] = useState({});
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: experiment } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: experimentId });
      return exps[0];
    },
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', experimentId, filters],
    queryFn: async () => {
      const allIndividuals = await base44.entities.Individual.filter({ 
        experiment_id: experimentId,
        alive: true 
      });
      
      return allIndividuals.filter(ind => {
        return Object.entries(filters).every(([factor, value]) => {
          if (value === 'all') return true;
          return ind.factors[factor] === value;
        });
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const events = selectedIndividuals.map(id => ({
        experiment_id: experimentId,
        individual_id: id,
        event_date: eventDate,
        offspring_count: offspringCounts[id] || 0
      }));

      await base44.entities.ReproductionEvent.bulkCreate(events);

      for (const id of selectedIndividuals) {
        const individual = individuals.find(i => i.individual_id === id);
        const count = offspringCounts[id] || 0;
        
        await base44.entities.Individual.update(individual.id, {
          first_reproduction_date: individual.first_reproduction_date || eventDate,
          last_reproduction_date: eventDate,
          cumulative_offspring: (individual.cumulative_offspring || 0) + count
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      alert('Reproduction events saved successfully!');
      onComplete();
    },
  });

  const handleFilterChange = (factor, value) => {
    setFilters({ ...filters, [factor]: value });
    setSelectedIndividuals([]);
    setOffspringCounts({});
  };

  const toggleIndividual = (id) => {
    if (selectedIndividuals.includes(id)) {
      setSelectedIndividuals(selectedIndividuals.filter(i => i !== id));
    } else {
      setSelectedIndividuals([...selectedIndividuals, id]);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onComplete}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reproduction Entry</h2>
          <p className="text-slate-600">Select individuals and record offspring counts</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters & Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategorySelector
            experiment={experiment}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Event Date</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {selectedIndividuals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Individuals ({individuals.length} available)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-auto">
              {individuals.map((ind) => (
                <div
                  key={ind.individual_id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleIndividual(ind.individual_id)}
                >
                  <Checkbox
                    checked={selectedIndividuals.includes(ind.individual_id)}
                    onCheckedChange={() => toggleIndividual(ind.individual_id)}
                  />
                  <span className="font-mono font-semibold">{ind.individual_id}</span>
                  <div className="flex gap-1 ml-auto">
                    {Object.entries(ind.factors).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-xs">
                        {k}: {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Enter Offspring Counts</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedIndividuals([])}>
                Change Selection
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedIndividuals.map((id) => {
                const ind = individuals.find(i => i.individual_id === id);
                return (
                  <div key={id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <span className="font-mono font-semibold w-32">{id}</span>
                    <div className="flex gap-1 flex-1">
                      {Object.entries(ind.factors).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs">
                          {k}: {v}
                        </Badge>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Count"
                      value={offspringCounts[id] || ''}
                      onChange={(e) => setOffspringCounts({ ...offspringCounts, [id]: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </div>
                );
              })}
            </div>

            <Button
              className="w-full mt-6 bg-green-600 hover:bg-green-700"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Reproduction Events'}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}