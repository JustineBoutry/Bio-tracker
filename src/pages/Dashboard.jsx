import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Skull, Droplet, Syringe } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useExperiment } from "../components/ExperimentContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import StatisticalTestPanel from "../components/dashboard/StatisticalTestPanel";

export default function Dashboard() {
  const { activeExperimentId } = useExperiment();
  const selectedExp = activeExperimentId;
  const [categoryFilters, setCategoryFilters] = useState({});
  const [selectedGraphFactors, setSelectedGraphFactors] = useState([]);
  const [facetFactor, setFacetFactor] = useState(null);
  const [selectedInfectionGraphFactors, setSelectedInfectionGraphFactors] = useState([]);
  const [facetInfectionFactor, setFacetInfectionFactor] = useState(null);
  const [excludeNotTested, setExcludeNotTested] = useState(false);
  const [selectedInfectionBars, setSelectedInfectionBars] = useState([]);
  const [selectedSurvivalBars, setSelectedSurvivalBars] = useState([]);
  const [selectedReproductionGraphFactors, setSelectedReproductionGraphFactors] = useState([]);
  const [facetReproductionFactor, setFacetReproductionFactor] = useState(null);
  const [selectedReproductionBars, setSelectedReproductionBars] = useState([]);

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
    infected: filteredIndividuals.filter(i => i.infected === "confirmed Yes").length,
    redConfirmed: filteredIndividuals.filter(i => i.red_confirmed).length,
    totalOffspring: filteredIndividuals.reduce((sum, i) => sum + (i.cumulative_offspring || 0), 0),
  };

  const daysPostInfection = experiment?.infection_date 
    ? differenceInDays(new Date(), new Date(experiment.infection_date))
    : null;

  const updateFilter = (factor, value) => {
    setCategoryFilters({ ...categoryFilters, [factor]: value });
  };

  const toggleGraphFactor = (factorName) => {
    setSelectedGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleInfectionGraphFactor = (factorName) => {
    setSelectedInfectionGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleReproductionGraphFactor = (factorName) => {
    setSelectedReproductionGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const getChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedGraphFactors.length === 0) return [];

    const groups = {};
    
    const filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetFactor] === filterByFacet)
      : allIndividuals;
    
    filteredInds.forEach(ind => {
      const groupKey = selectedGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, aliveCount: 0, deadCount: 0 };
      }
      
      if (ind.alive) {
        groups[groupKey].aliveCount++;
      } else {
        groups[groupKey].deadCount++;
      }
    });

    return Object.values(groups).map(group => {
      const total = group.aliveCount + group.deadCount;
      return {
        name: group.name,
        alive: total > 0 ? (group.aliveCount / total) * 100 : 0,
        dead: total > 0 ? (group.deadCount / total) * 100 : 0,
        total: total,
        aliveCount: group.aliveCount,
        deadCount: group.deadCount
      };
    });
  };

  const getFacetLevels = () => {
    if (!facetFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetFactor);
    return factor?.levels || [];
  };

  const getInfectionChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedInfectionGraphFactors.length === 0) return [];

    const groups = {};
    
    const filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetInfectionFactor] === filterByFacet)
      : allIndividuals;
    
    filteredInds.forEach(ind => {
      const groupKey = selectedInfectionGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, confirmedYes: 0, confirmedNo: 0, notTested: 0 };
      }
      
      const status = ind.infected || 'not_tested';
      if (status === 'confirmed Yes') {
        groups[groupKey].confirmedYes++;
      } else if (status === 'confirmed No') {
        groups[groupKey].confirmedNo++;
      } else {
        groups[groupKey].notTested++;
      }
    });

    return Object.values(groups).map(group => {
      const total = excludeNotTested 
        ? group.confirmedYes + group.confirmedNo
        : group.confirmedYes + group.confirmedNo + group.notTested;
      return {
        name: group.name,
        confirmedYes: total > 0 ? (group.confirmedYes / total) * 100 : 0,
        confirmedNo: total > 0 ? (group.confirmedNo / total) * 100 : 0,
        notTested: total > 0 ? (group.notTested / total) * 100 : 0,
        total: total,
        rawCounts: {
          confirmedYes: group.confirmedYes,
          confirmedNo: group.confirmedNo,
          notTested: group.notTested
        }
      };
    });
  };

  const getInfectionFacetLevels = () => {
    if (!facetInfectionFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetInfectionFactor);
    return factor?.levels || [];
  };

  const getReproductionChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedReproductionGraphFactors.length === 0) return [];

    const groups = {};
    
    const filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetReproductionFactor] === filterByFacet)
      : allIndividuals;
    
    filteredInds.forEach(ind => {
      const groupKey = selectedReproductionGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, reproduced: 0, notReproduced: 0 };
      }
      
      // Count as reproduced if cumulative_offspring > 0
      const offspring = Number(ind.cumulative_offspring) || 0;
      if (offspring > 0) {
        groups[groupKey].reproduced++;
      } else {
        groups[groupKey].notReproduced++;
      }
    });

    return Object.values(groups).map(group => {
      const total = group.reproduced + group.notReproduced;
      return {
        name: group.name,
        reproduced: total > 0 ? (group.reproduced / total) * 100 : 0,
        notReproduced: total > 0 ? (group.notReproduced / total) * 100 : 0,
        total: total,
        rawCounts: {
          reproduced: group.reproduced,
          notReproduced: group.notReproduced
        },
        reproducedCount: group.reproduced,
        notReproducedCount: group.notReproduced
      };
    });
  };

  const getReproductionFacetLevels = () => {
    if (!facetReproductionFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetReproductionFactor);
    return factor?.levels || [];
  };

  const chartData = !facetFactor ? getChartData() : null;
  const facetLevels = getFacetLevels();
  const infectionChartData = !facetInfectionFactor ? getInfectionChartData() : null;
  const infectionFacetLevels = getInfectionFacetLevels();
  const reproductionChartData = !facetReproductionFactor ? getReproductionChartData() : null;
  const reproductionFacetLevels = getReproductionFacetLevels();

  const handleInfectionBarClick = (data) => {
    if (!data) return;
    const barName = data.name;
    const existing = selectedInfectionBars.find(b => b.name === barName);
    
    if (existing) {
      setSelectedInfectionBars(selectedInfectionBars.filter(b => b.name !== barName));
    } else {
      setSelectedInfectionBars([...selectedInfectionBars, {
        name: barName,
        data: {
          confirmedYes: data.rawCounts.confirmedYes,
          confirmedNo: data.rawCounts.confirmedNo,
          notTested: data.rawCounts.notTested,
          total: data.total
        }
      }]);
    }
  };

  const handleSurvivalBarClick = (data) => {
    if (!data) return;
    const barName = data.name;
    const existing = selectedSurvivalBars.find(b => b.name === barName);
    
    if (existing) {
      setSelectedSurvivalBars(selectedSurvivalBars.filter(b => b.name !== barName));
    } else {
      setSelectedSurvivalBars([...selectedSurvivalBars, {
        name: barName,
        data: {
          alive: data.aliveCount || Math.round((data.alive / 100) * data.total),
          dead: data.deadCount || Math.round((data.dead / 100) * data.total),
          total: data.total
        }
      }]);
    }
  };

  const handleReproductionBarClick = (data) => {
    if (!data) return;
    const barName = data.name;
    const existing = selectedReproductionBars.find(b => b.name === barName);
    
    if (existing) {
      setSelectedReproductionBars(selectedReproductionBars.filter(b => b.name !== barName));
    } else {
      setSelectedReproductionBars([...selectedReproductionBars, {
        name: barName,
        data: {
          reproduced: data.rawCounts.reproduced,
          notReproduced: data.rawCounts.notReproduced,
          total: data.total
        }
      }]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Survival by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`graph-${factor.name}`}
                          checked={selectedGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleGraphFactor(factor.name)}
                          disabled={facetFactor === factor.name}
                        />
                        <label htmlFor={`graph-${factor.name}`} className="text-sm cursor-pointer">
                          {factor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Facet by (optional):</p>
                  <select
                    className="border rounded p-2 text-sm"
                    value={facetFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetFactor(value);
                      if (value && selectedGraphFactors.includes(value)) {
                        setSelectedGraphFactors(selectedGraphFactors.filter(f => f !== value));
                      }
                    }}
                  >
                    <option value="">None</option>
                    {experiment.factors?.map(factor => (
                      <option key={factor.name} value={factor.name}>
                        {factor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedGraphFactors.length > 0 ? (
                !facetFactor ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData} onClick={(e) => e?.activePayload?.[0] && handleSurvivalBarClick(e.activePayload[0].payload)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                        <Legend />
                        <Bar dataKey="alive" stackId="a" name="Alive" cursor="pointer">
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedSurvivalBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                              opacity={selectedSurvivalBars.length > 0 && !selectedSurvivalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="dead" stackId="a" name="Dead" cursor="pointer">
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedSurvivalBars.find(b => b.name === entry.name) ? "#4b5563" : "#6b7280"}
                              opacity={selectedSurvivalBars.length > 0 && !selectedSurvivalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedSurvivalBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedSurvivalBars}
                          onClear={() => setSelectedSurvivalBars([])}
                          chartType="survival"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {facetLevels.map(level => {
                      const facetData = getChartData(level);
                      return (
                        <div key={level} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetFactor}: {level}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={facetData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                              <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                              <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                              <Legend />
                              <Bar dataKey="alive" stackId="a" fill="#22c55e" name="Alive" />
                              <Bar dataKey="dead" stackId="a" fill="#6b7280" name="Dead" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select at least one factor to display the chart
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Reproduction by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`reproduction-graph-${factor.name}`}
                          checked={selectedReproductionGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleReproductionGraphFactor(factor.name)}
                          disabled={facetReproductionFactor === factor.name}
                        />
                        <label htmlFor={`reproduction-graph-${factor.name}`} className="text-sm cursor-pointer">
                          {factor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Facet by (optional):</p>
                  <select
                    className="border rounded p-2 text-sm"
                    value={facetReproductionFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetReproductionFactor(value);
                      if (value && selectedReproductionGraphFactors.includes(value)) {
                        setSelectedReproductionGraphFactors(selectedReproductionGraphFactors.filter(f => f !== value));
                      }
                    }}
                  >
                    <option value="">None</option>
                    {experiment.factors?.map(factor => (
                      <option key={factor.name} value={factor.name}>
                        {factor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedReproductionGraphFactors.length > 0 ? (
                !facetReproductionFactor ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={reproductionChartData} onClick={(e) => e?.activePayload?.[0] && handleReproductionBarClick(e.activePayload[0].payload)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                        <Legend />
                        <Bar dataKey="reproduced" stackId="a" name="Reproduced" cursor="pointer">
                          {reproductionChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedReproductionBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                              opacity={selectedReproductionBars.length > 0 && !selectedReproductionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="notReproduced" stackId="a" name="Not Reproduced" cursor="pointer">
                          {reproductionChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedReproductionBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                              opacity={selectedReproductionBars.length > 0 && !selectedReproductionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedReproductionBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedReproductionBars}
                          onClear={() => setSelectedReproductionBars([])}
                          chartType="reproduction"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reproductionFacetLevels.map(level => {
                      const facetData = getReproductionChartData(level);
                      return (
                        <div key={level} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetReproductionFactor}: {level}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={facetData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                              <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                              <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                              <Legend />
                              <Bar dataKey="reproduced" stackId="a" fill="#22c55e" name="Reproduced" />
                              <Bar dataKey="notReproduced" stackId="a" fill="#ef4444" name="Not Reproduced" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select at least one factor to display the chart
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Infection by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`infection-graph-${factor.name}`}
                          checked={selectedInfectionGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleInfectionGraphFactor(factor.name)}
                          disabled={facetInfectionFactor === factor.name}
                        />
                        <label htmlFor={`infection-graph-${factor.name}`} className="text-sm cursor-pointer">
                          {factor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Facet by (optional):</p>
                  <select
                    className="border rounded p-2 text-sm"
                    value={facetInfectionFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetInfectionFactor(value);
                      if (value && selectedInfectionGraphFactors.includes(value)) {
                        setSelectedInfectionGraphFactors(selectedInfectionGraphFactors.filter(f => f !== value));
                      }
                    }}
                  >
                    <option value="">None</option>
                    {experiment.factors?.map(factor => (
                      <option key={factor.name} value={factor.name}>
                        {factor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="exclude-not-tested"
                    checked={excludeNotTested}
                    onCheckedChange={setExcludeNotTested}
                  />
                  <label htmlFor="exclude-not-tested" className="text-sm cursor-pointer">
                    Exclude "Not Tested" from proportion calculation
                  </label>
                </div>
              </div>

              {selectedInfectionGraphFactors.length > 0 ? (
                !facetInfectionFactor ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={infectionChartData} onClick={(e) => e?.activePayload?.[0] && handleInfectionBarClick(e.activePayload[0].payload)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                        <Legend />
                        <Bar dataKey="confirmedYes" stackId="a" name="Confirmed Yes" cursor="pointer">
                          {infectionChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedInfectionBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                              opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="confirmedNo" stackId="a" name="Confirmed No" cursor="pointer">
                          {infectionChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedInfectionBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                              opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        {!excludeNotTested && (
                          <Bar dataKey="notTested" stackId="a" name="Not Tested" cursor="pointer">
                            {infectionChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={selectedInfectionBars.find(b => b.name === entry.name) ? "#6b7280" : "#9ca3af"}
                                opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                              />
                            ))}
                          </Bar>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedInfectionBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedInfectionBars}
                          onClear={() => setSelectedInfectionBars([])}
                          chartType="infection"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {infectionFacetLevels.map(level => {
                      const facetData = getInfectionChartData(level);
                      return (
                        <div key={level} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetInfectionFactor}: {level}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={facetData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                              <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                              <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                              <Legend />
                              <Bar dataKey="confirmedYes" stackId="a" fill="#ef4444" name="Confirmed Yes" />
                              <Bar dataKey="confirmedNo" stackId="a" fill="#22c55e" name="Confirmed No" />
                              {!excludeNotTested && <Bar dataKey="notTested" stackId="a" fill="#9ca3af" name="Not Tested" />}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select at least one factor to display the chart
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}