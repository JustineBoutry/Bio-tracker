import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Skull, Droplet, Syringe } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialExpId = urlParams.get('id');
  
  const [selectedExp, setSelectedExp] = useState(initialExpId || null);
  const [categoryFilters, setCategoryFilters] = useState({});

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExp],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExp });
      return exps[0];
    },
    enabled: !!selectedExp,
  });

  const { data: allIndividuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExp }),
    enabled: !!selectedExp,
  });

  const filteredIndividuals = allIndividuals.filter(ind => {
    return Object.entries(categoryFilters).every(([key, value]) => 
      value === 'all' || ind.factors?.[key] === value
    );
  });

  const stats = {
    total: filteredIndividuals.length,
    alive: filteredIndividuals.filter(i => i.alive).length,
    dead: filteredIndividuals.filter(i => !i.alive).length,
    infected: filteredIndividuals.filter(i => i.infected).length,
    redConfirmed: filteredIndividuals.filter(i => i.red_confirmed).length,
    totalOffspring: filteredIndividuals.reduce((sum, i) => sum + (i.cumulative_offspring || 0), 0),
  };

  const daysPostInfection = experiment?.infection_date 
    ? differenceInDays(new Date(), new Date(experiment.infection_date))
    : null;

  const updateFilter = (factor, value) => {
    setCategoryFilters({ ...categoryFilters, [factor]: value });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            className="w-full border rounded p-2"
            value={selectedExp || ''}
            onChange={(e) => {
              setSelectedExp(e.target.value);
              setCategoryFilters({});
            }}
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

      {experiment && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Experiment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-semibold">{format(new Date(experiment.start_date), "MMM d, yyyy")}</p>
                </div>

                {experiment.infection_date && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Infection Date</p>
                      <p className="font-semibold">{format(new Date(experiment.infection_date), "MMM d, yyyy")}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Days Post Infection</p>
                      <p className="text-2xl font-bold text-blue-600">{daysPostInfection}</p>
                    </div>
                  </>
                )}

                {!experiment.infection_date && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Set Infection Date</p>
                    <Input
                      type="date"
                      onChange={async (e) => {
                        if (e.target.value) {
                          await base44.entities.Experiment.update(experiment.id, {
                            infection_date: e.target.value
                          });
                          window.location.reload();
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {experiment.factors && experiment.factors.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filter by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {experiment.factors.map((factor) => (
                    <div key={factor.name}>
                      <label className="text-sm font-medium">{factor.name}</label>
                      <select
                        className="w-full border rounded p-2 mt-1"
                        value={categoryFilters[factor.name] || 'all'}
                        onChange={(e) => updateFilter(factor.name, e.target.value)}
                      >
                        <option value="all">All</option>
                        {factor.levels.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Individuals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Alive / Dead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">{stats.alive}</div>
                    <div className="text-sm text-gray-500">{stats.dead} deceased</div>
                  </div>
                  <Skull className="w-8 h-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Infected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-purple-600">{stats.infected}</div>
                  <Syringe className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Red Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600">{stats.redConfirmed}</div>
                    <div className="text-sm text-gray-500">
                      {stats.total > 0 ? ((stats.redConfirmed / stats.total) * 100).toFixed(1) : 0}% of total
                    </div>
                  </div>
                  <Droplet className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reproduction Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Offspring</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalOffspring}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average per Individual</p>
                  <p className="text-3xl font-bold">
                    {stats.total > 0 ? (stats.totalOffspring / stats.total).toFixed(1) : 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reproducing Individuals</p>
                  <p className="text-3xl font-bold">
                    {filteredIndividuals.filter(i => (i.cumulative_offspring || 0) > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}