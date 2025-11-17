import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dataset() {
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExperiment],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExperiment }),
    enabled: !!selectedExperiment,
  });

  const exportCSV = () => {
    const headers = [
      'individual_id', 'alive', 'death_date', 'infected', 
      'red_signals_count', 'red_confirmed', 
      'first_reproduction_date', 'last_reproduction_date', 'cumulative_offspring'
    ];
    
    const rows = individuals.map(ind => [
      ind.individual_id,
      ind.alive,
      ind.death_date || '',
      ind.infected,
      ind.red_signals_count || 0,
      ind.red_confirmed || false,
      ind.first_reproduction_date || '',
      ind.last_reproduction_date || '',
      ind.cumulative_offspring || 0
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset.csv';
    a.click();
  };

  return (
    <div className="p-8 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dataset</h1>

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
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Data ({individuals.length} individuals)</CardTitle>
              <Button onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Alive</TableHead>
                    <TableHead>Death Date</TableHead>
                    <TableHead>Infected</TableHead>
                    <TableHead>Red Signals</TableHead>
                    <TableHead>Red Confirmed</TableHead>
                    <TableHead>First Repro</TableHead>
                    <TableHead>Last Repro</TableHead>
                    <TableHead>Offspring</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {individuals.map((ind) => (
                    <TableRow key={ind.id}>
                      <TableCell className="font-mono">{ind.individual_id}</TableCell>
                      <TableCell>{ind.alive ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{ind.death_date || '-'}</TableCell>
                      <TableCell>{ind.infected ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{ind.red_signals_count || 0}</TableCell>
                      <TableCell>{ind.red_confirmed ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{ind.first_reproduction_date || '-'}</TableCell>
                      <TableCell>{ind.last_reproduction_date || '-'}</TableCell>
                      <TableCell>{ind.cumulative_offspring || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}