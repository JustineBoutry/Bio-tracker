import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Skull, Droplet, Syringe, Baby, Calendar, Activity } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialExperimentId = urlParams.get('id');
  
  const [selectedExperiment, setSelectedExperiment] = useState(initialExperimentId || null);
  const [filterFactor, setFilterFactor] = useState(null);
  const [filterValue, setFilterValue] = useState('all');

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

  const filteredIndividuals = individuals.filter(ind => {
    if (!filterFactor || filterValue === 'all') return true;
    return ind.factors[filterFactor] === filterValue;
  });

  const stats = {
    total: filteredIndividuals.length,
    alive: filteredIndividuals.filter(i => i.alive).length,
    dead: filteredIndividuals.filter(i => !i.alive).length,
    infected: filteredIndividuals.filter(i => i.infected).length,
    nonInfected: filteredIndividuals.filter(i => !i.infected).length,
    redConfirmed: filteredIndividuals.filter(i => i.red_confirmed).length,
    totalOffspring: filteredIndividuals.reduce((sum, i) => sum + (i.cumulative_offspring || 0), 0),
  };

  const dpi = experiment?.infection_date 
    ? differenceInDays(new Date(), new Date(experiment.infection_date))
    : null;

  const getChartData = () => {
    if (!experiment?.factors || !filterFactor) return [];

    const factor = experiment.factors.find(f => f.name === filterFactor);
    if (!factor) return [];

    return factor.levels.map(level => {
      const levelIndividuals = individuals.filter(i => i.factors[filterFactor] === level);
      return {
        name: level,
        alive: levelIndividuals.filter(i => i.alive).length,
        dead: levelIndividuals.filter(i => !i.alive).length,
        infected: levelIndividuals.filter(i => i.infected).length,
        redConfirmed: levelIndividuals.filter(i => i.red_confirmed).length,
      };
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Experiment overview and statistics</p>
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

      {experiment && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Experiment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Start Date</span>
                  </div>
                  <p className="font-semibold">{format(new Date(experiment.start_date), "MMM d, yyyy")}</p>
                </div>

                {experiment.infection_date && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">Infection Date</span>
                      </div>
                      <p className="font-semibold">{format(new Date(experiment.infection_date), "MMM d, yyyy")}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Days Post Infection</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{dpi}</p>
                    </div>
                  </>
                )}

                <div>
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Today</span>
                  </div>
                  <p className="font-semibold">{format(new Date(), "MMM d, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Factor</label>
                  <Select value={filterFactor || ""} onValueChange={setFilterFactor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a factor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No filter</SelectItem>
                      {experiment.factors?.map((factor) => (
                        <SelectItem key={factor.name} value={factor.name}>
                          {factor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filterFactor && filterFactor !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Level</label>
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {experiment.factors
                          ?.find(f => f.name === filterFactor)
                          ?.levels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Individuals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Alive / Dead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">{stats.alive}</div>
                    <div className="text-sm text-slate-500">
                      {stats.dead} deceased
                    </div>
                  </div>
                  <Skull className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Infection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-purple-600">{stats.infected}</div>
                    <div className="text-sm text-slate-500">
                      {stats.nonInfected} non-infected
                    </div>
                  </div>
                  <Syringe className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Red Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600">{stats.redConfirmed}</div>
                    <div className="text-sm text-slate-500">
                      {((stats.redConfirmed / stats.total) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                  <Droplet className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="w-5 h-5" />
                Reproduction Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Offspring</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalOffspring}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Average per Individual</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {(stats.totalOffspring / stats.total).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Reproducing Individuals</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {filteredIndividuals.filter(i => i.cumulative_offspring > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {filterFactor && filterFactor !== 'none' && (
            <Card>
              <CardHeader>
                <CardTitle>Statistics by {filterFactor}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="alive" fill="#10b981" name="Alive" />
                    <Bar dataKey="dead" fill="#64748b" name="Dead" />
                    <Bar dataKey="infected" fill="#a855f7" name="Infected" />
                    <Bar dataKey="redConfirmed" fill="#ef4444" name="Red Confirmed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}