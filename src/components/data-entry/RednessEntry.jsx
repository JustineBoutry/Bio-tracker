import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CategorySelector from "./CategorySelector";

export default function RednessEntry({ experimentId, onComplete }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({});
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);

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
      for (const id of selectedIndividuals) {
        const individual = individuals.find(i => i.individual_id === id);
        const newCount = (individual.red_signals_count || 0) + 1;
        
        await base44.entities.Individual.update(individual.id, {
          red_signals_count: newCount,
          red_confirmed: newCount >= 3
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      alert(`Updated redness for ${selectedIndividuals.length} individuals`);
      onComplete();
    },
  });

  const handleFilterChange = (factor, value) => {
    setFilters({ ...filters, [factor]: value });
    setSelectedIndividuals([]);
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
          <h2 className="text-2xl font-bold text-slate-900">Redness Entry</h2>
          <p className="text-slate-600">Record red signals (confirmed at 3 signals)</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <CategorySelector
            experiment={experiment}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Select Red Individuals ({individuals.length} available)
            {selectedIndividuals.length > 0 && ` - ${selectedIndividuals.length} selected`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-auto mb-4">
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
                <div className="flex gap-1 flex-1">
                  {Object.entries(ind.factors).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
                {ind.red_signals_count > 0 && (
                  <Badge variant={ind.red_confirmed ? "default" : "outline"} className="ml-auto">
                    {ind.red_signals_count} signals {ind.red_confirmed && '✓'}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            onClick={() => saveMutation.mutate()}
            disabled={selectedIndividuals.length === 0 || saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : `Add Red Signal for ${selectedIndividuals.length} individuals`}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}