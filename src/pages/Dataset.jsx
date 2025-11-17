import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Search, Edit } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dataset() {
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('individual_id');
  const [filterFactors, setFilterFactors] = useState({});

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExperiment],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExperiment });
      return exps[0];
    },
    enabled: !!selectedExperiment,
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExperiment],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExperiment }),
    enabled: !!selectedExperiment,
  });

  const filteredIndividuals = individuals
    .filter(ind => {
      if (searchTerm) {
        return ind.individual_id.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(ind => {
      return Object.entries(filterFactors).every(([factor, value]) => {
        if (value === 'all' || !value) return true;
        return ind.factors[factor] === value;
      });
    });

  const exportToCSV = () => {
    if (!filteredIndividuals.length) return;

    const factorKeys = experiment?.factors?.map(f => f.name) || [];
    
    const headers = [
      'individual_id',
      ...factorKeys,
      'alive',
      'death_date',
      'infected',
      'spores_count',
      'spores_volume',
      'red_signals_count',
      'red_confirmed',
      'first_reproduction_date',
      'last_reproduction_date',
      'cumulative_offspring'
    ];

    const rows = filteredIndividuals.map(ind => [
      ind.individual_id,
      ...factorKeys.map(k => ind.factors[k] || ''),
      ind.alive,
      ind.death_date || '',
      ind.infected,
      ind.spores_count || '',
      ind.spores_volume || '',
      ind.red_signals_count || 0,
      ind.red_confirmed || false,
      ind.first_reproduction_date || '',
      ind.last_reproduction_date || '',
      ind.cumulative_offspring || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dataset_${experiment?.experiment_name}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Dataset</h1>
        <p className="text-slate-600">View and export full experimental data</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedExperiment || ""} onValueChange={setSelectedExperiment}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an experiment..." />
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
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search ID</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search individual..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {experiment?.factors?.map((factor) => (
                  <div key={factor.name}>
                    <label className="block text-sm font-medium mb-2">{factor.name}</label>
                    <Select
                      value={filterFactors[factor.name] || "all"}
                      onValueChange={(value) => setFilterFactors({ ...filterFactors, [factor.name]: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`All ${factor.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {factor.levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Data Table ({filteredIndividuals.length} individuals)
                </CardTitle>
                <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
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
                      {experiment?.factors?.map(f => (
                        <TableHead key={f.name}>{f.name}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                      <TableHead>Death Date</TableHead>
                      <TableHead>Infected</TableHead>
                      <TableHead>Spores</TableHead>
                      <TableHead>Red Status</TableHead>
                      <TableHead>First Repro</TableHead>
                      <TableHead>Last Repro</TableHead>
                      <TableHead>Total Offspring</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndividuals.map((ind) => (
                      <TableRow key={ind.id}>
                        <TableCell className="font-mono font-semibold">
                          {ind.individual_id}
                        </TableCell>
                        {experiment?.factors?.map(f => (
                          <TableCell key={f.name}>
                            <Badge variant="secondary">{ind.factors[f.name]}</Badge>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Badge variant={ind.alive ? "default" : "secondary"}>
                            {ind.alive ? "Alive" : "Dead"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ind.death_date ? format(new Date(ind.death_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ind.infected ? "destructive" : "outline"}>
                            {ind.infected ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ind.spores_count ? (
                            <span className="text-sm">
                              {ind.spores_count} {ind.spores_volume && `(${ind.spores_volume})`}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {ind.red_confirmed ? (
                            <Badge className="bg-red-100 text-red-800">Confirmed</Badge>
                          ) : ind.red_signals_count > 0 ? (
                            <Badge variant="outline">{ind.red_signals_count} signals</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {ind.first_reproduction_date 
                            ? format(new Date(ind.first_reproduction_date), "MMM d") 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {ind.last_reproduction_date 
                            ? format(new Date(ind.last_reproduction_date), "MMM d") 
                            : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {ind.cumulative_offspring || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}