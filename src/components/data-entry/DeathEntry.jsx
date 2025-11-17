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

export default function DeathEntry({ experimentId, onComplete }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({});
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [deathDate, setDeathDate] = useState(format(new Date(), "yyyy-MM-dd"));

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
        await base44.entities.Individual.update(individual.id, {
          alive: false,
          death_date: deathDate
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individuals'] });
      alert(`Marked ${selectedIndividuals.length} individuals as deceased`);
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
          <h2 className="text-2xl font-bold text-slate-900">Death Entry</h2>
          <p className="text-slate-600">Mark deceased individuals</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <CategorySelector
            experiment={experiment}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Death Date</label>
            <Input
              type="date"
              value={deathDate}
              onChange={(e) => setDeathDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Select Deceased Individuals ({individuals.length} alive)
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

          <Button
            className="w-full bg-slate-600 hover:bg-slate-700"
            onClick={() => saveMutation.mutate()}
            disabled={selectedIndividuals.length === 0 || saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : `Mark ${selectedIndividuals.length} as Deceased`}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}