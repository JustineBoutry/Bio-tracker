import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Skull, Droplet, Syringe, X, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useExperiment } from "../components/ExperimentContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
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
  const [selectedSurvivalCurveFactors, setSelectedSurvivalCurveFactors] = useState([]);
  const [selectedSurvivalCurves, setSelectedSurvivalCurves] = useState([]);
  const [logRankTestResult, setLogRankTestResult] = useState(null);
  const [runningLogRank, setRunningLogRank] = useState(false);
  const [selectedRedSignalGraphFactors, setSelectedRedSignalGraphFactors] = useState([]);
  const [facetRedSignalFactor, setFacetRedSignalFactor] = useState(null);
  const [selectedRedSignalBars, setSelectedRedSignalBars] = useState([]);

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

  const toggleSurvivalCurveFactor = (factorName) => {
    setSelectedSurvivalCurveFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleRedSignalGraphFactor = (factorName) => {
    setSelectedRedSignalGraphFactors(prev => 
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
    }).sort((a, b) => a.name.localeCompare(b.name));
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
    }).sort((a, b) => a.name.localeCompare(b.name));
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
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getReproductionFacetLevels = () => {
    if (!facetReproductionFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetReproductionFactor);
    return factor?.levels || [];
  };

  const getRedSignalChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedRedSignalGraphFactors.length === 0) return [];

    const groups = {};
    
    const filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetRedSignalFactor] === filterByFacet)
      : allIndividuals;
    
    filteredInds.forEach(ind => {
      const groupKey = selectedRedSignalGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, redConfirmed: 0, notRedConfirmed: 0 };
      }
      
      if (ind.red_confirmed) {
        groups[groupKey].redConfirmed++;
      } else {
        groups[groupKey].notRedConfirmed++;
      }
    });

    return Object.values(groups).map(group => {
      const total = group.redConfirmed + group.notRedConfirmed;
      return {
        name: group.name,
        redConfirmed: total > 0 ? (group.redConfirmed / total) * 100 : 0,
        notRedConfirmed: total > 0 ? (group.notRedConfirmed / total) * 100 : 0,
        total: total,
        redConfirmedCount: group.redConfirmed,
        notRedConfirmedCount: group.notRedConfirmed
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getRedSignalFacetLevels = () => {
    if (!facetRedSignalFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetRedSignalFactor);
    return factor?.levels || [];
  };

  const getSurvivalCurveData = () => {
    if (!experiment?.factors || selectedSurvivalCurveFactors.length === 0 || !experiment?.start_date) return [];

    const groups = {};
    let maxDay = 0;
    
    allIndividuals.forEach(ind => {
      const groupKey = selectedSurvivalCurveFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      if (ind.death_date) {
        const daysSinceStart = differenceInDays(new Date(ind.death_date), new Date(experiment.start_date));
        groups[groupKey].push({ day: daysSinceStart, event: 'death' });
        maxDay = Math.max(maxDay, daysSinceStart);
      } else {
        // For censored (alive), use the latest death date in the dataset
        groups[groupKey].push({ day: null, event: 'censored' });
      }
    });

    // Calculate Kaplan-Meier survival curves
    const curves = {};
    Object.entries(groups).forEach(([groupName, events]) => {
      events.sort((a, b) => (a.day || maxDay) - (b.day || maxDay));
      
      let atRisk = events.length;
      let survival = 1.0;
      const curve = [{ day: 0, survival: 1.0, atRisk: atRisk }];
      
      const deathEvents = events.filter(e => e.event === 'death');
      const uniqueDays = [...new Set(deathEvents.map(e => e.day))].sort((a, b) => a - b);
      
      uniqueDays.forEach(day => {
        const deaths = deathEvents.filter(e => e.day === day).length;
        if (deaths > 0) {
          survival = survival * (1 - deaths / atRisk);
          atRisk -= deaths;
          curve.push({ day, survival, atRisk, deaths });
        }
      });
      
      curves[groupName] = { curve, totalN: events.length, events: events };
    });

    // Merge all curves into time points up to maxDay
    const allDays = new Set([0]);
    Object.values(curves).forEach(({ curve }) => {
      curve.forEach(point => allDays.add(point.day));
    });
    
    const sortedDays = Array.from(allDays).sort((a, b) => a - b).filter(d => d <= maxDay);
    
    return sortedDays.map(day => {
      const point = { day };
      Object.entries(curves).forEach(([groupName, { curve }]) => {
        const lastPoint = curve.filter(p => p.day <= day).slice(-1)[0];
        point[groupName] = lastPoint ? lastPoint.survival * 100 : 100;
      });
      return point;
    });
  };

  const handleSurvivalCurveClick = (groupName) => {
    const existing = selectedSurvivalCurves.find(g => g === groupName);
    if (existing) {
      setSelectedSurvivalCurves(selectedSurvivalCurves.filter(g => g !== groupName));
    } else {
      setSelectedSurvivalCurves([...selectedSurvivalCurves, groupName]);
    }
    setLogRankTestResult(null);
  };

  const runLogRankTest = async () => {
    setRunningLogRank(true);
    setLogRankTestResult(null);
    
    try {
      // Prepare survival data for selected groups
      const survivalData = {};
      
      allIndividuals.forEach(ind => {
        const groupKey = selectedSurvivalCurveFactors
          .map(factor => ind.factors?.[factor] || 'Unknown')
          .join(' - ');
        
        if (!selectedSurvivalCurves.includes(groupKey)) return;
        
        if (!survivalData[groupKey]) {
          survivalData[groupKey] = [];
        }
        
        if (ind.death_date) {
          const daysSinceStart = differenceInDays(new Date(ind.death_date), new Date(experiment.start_date));
          survivalData[groupKey].push({ time: daysSinceStart, status: 1 });
        } else {
          // Find max death time for censoring
          const maxDeathTime = allIndividuals
            .filter(i => i.death_date)
            .map(i => differenceInDays(new Date(i.death_date), new Date(experiment.start_date)))
            .reduce((max, time) => Math.max(max, time), 0);
          survivalData[groupKey].push({ time: maxDeathTime, status: 0 });
        }
      });

      const prompt = `Perform a log-rank test on the following survival data:

${Object.entries(survivalData).map(([group, data]) => 
  `Group: ${group}
  Data: ${JSON.stringify(data)}`
).join('\n\n')}

Instructions:
1. Calculate the log-rank test statistic (chi-square)
2. Calculate degrees of freedom (number of groups - 1)
3. Calculate the p-value
4. Provide interpretation

Return in JSON format:
{
  "test_statistic": number,
  "degrees_of_freedom": number,
  "p_value": number,
  "significant": boolean (p < 0.05),
  "interpretation": "string describing the result"
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            test_statistic: { type: "number" },
            degrees_of_freedom: { type: "number" },
            p_value: { type: "number" },
            significant: { type: "boolean" },
            interpretation: { type: "string" }
          }
        }
      });

      setLogRankTestResult(response);
    } catch (error) {
      alert('Log-rank test failed: ' + error.message);
    } finally {
      setRunningLogRank(false);
    }
  };

  const chartData = !facetFactor ? getChartData() : null;
  const facetLevels = getFacetLevels();
  const infectionChartData = !facetInfectionFactor ? getInfectionChartData() : null;
  const infectionFacetLevels = getInfectionFacetLevels();
  const reproductionChartData = !facetReproductionFactor ? getReproductionChartData() : null;
  const reproductionFacetLevels = getReproductionFacetLevels();
  const survivalCurveData = getSurvivalCurveData();
  const redSignalChartData = !facetRedSignalFactor ? getRedSignalChartData() : null;
  const redSignalFacetLevels = getRedSignalFacetLevels();

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
          reproduced: data.reproducedCount || data.rawCounts?.reproduced || 0,
          notReproduced: data.notReproducedCount || data.rawCounts?.notReproduced || 0,
          total: data.total
        }
      }]);
    }
  };

  const handleRedSignalBarClick = (data) => {
    if (!data) return;
    const barName = data.name;
    const existing = selectedRedSignalBars.find(b => b.name === barName);
    
    if (existing) {
      setSelectedRedSignalBars(selectedRedSignalBars.filter(b => b.name !== barName));
    } else {
      setSelectedRedSignalBars([...selectedRedSignalBars, {
        name: barName,
        data: {
          redConfirmed: data.redConfirmedCount || 0,
          notRedConfirmed: data.notRedConfirmedCount || 0,
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
                  <div>
                    <div className="text-3xl font-bold text-purple-600">{stats.infected}</div>
                    <div className="text-sm text-gray-500">
                      {(() => {
                        const confirmedYes = filteredIndividuals.filter(i => i.infected === "confirmed Yes").length;
                        const confirmedNo = filteredIndividuals.filter(i => i.infected === "confirmed No").length;
                        const totalConfirmed = confirmedYes + confirmedNo;
                        return totalConfirmed > 0 && stats.total > 0 
                          ? `${((totalConfirmed / stats.total) * 100).toFixed(1)}% tested`
                          : '0% tested';
                      })()}
                    </div>
                  </div>
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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {facetLevels.map(level => {
                        const facetData = getChartData(level);
                        return (
                          <div key={level} className="border rounded-lg p-4">
                            <h3 className="text-center font-semibold mb-3">{facetFactor}: {level}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={facetData} onClick={(e) => e?.activePayload?.[0] && handleSurvivalBarClick(e.activePayload[0].payload)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                                <Legend />
                                <Bar dataKey="alive" stackId="a" name="Alive" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedSurvivalBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                                      opacity={selectedSurvivalBars.length > 0 && !selectedSurvivalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="dead" stackId="a" name="Dead" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedSurvivalBars.find(b => b.name === entry.name) ? "#4b5563" : "#6b7280"}
                                      opacity={selectedSurvivalBars.length > 0 && !selectedSurvivalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
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
              <CardTitle>Survival Curves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`survival-curve-${factor.name}`}
                          checked={selectedSurvivalCurveFactors.includes(factor.name)}
                          onCheckedChange={() => toggleSurvivalCurveFactor(factor.name)}
                        />
                        <label htmlFor={`survival-curve-${factor.name}`} className="text-sm cursor-pointer">
                          {factor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedSurvivalCurveFactors.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={survivalCurveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        label={{ value: 'Days Since Start', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Survival (%)', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                      <Legend 
                        onClick={(e) => handleSurvivalCurveClick(e.value)}
                        wrapperStyle={{ cursor: 'pointer' }}
                      />
                      {Object.keys(survivalCurveData[0] || {})
                        .filter(key => key !== 'day')
                        .map((groupName, idx) => {
                          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                          const isSelected = selectedSurvivalCurves.includes(groupName);
                          return (
                            <Line
                              key={groupName}
                              type="stepAfter"
                              dataKey={groupName}
                              stroke={colors[idx % colors.length]}
                              strokeWidth={isSelected ? 3 : 2}
                              opacity={selectedSurvivalCurves.length > 0 && !isSelected ? 0.3 : 1}
                              dot={false}
                              name={groupName}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-sm text-gray-600 text-center">
                    Click on legend items to select groups for log-rank testing
                  </div>
                  {selectedSurvivalCurves.length >= 2 && (
                    <div className="mt-4">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-blue-800">
                              Log-Rank Test ({selectedSurvivalCurves.length} groups selected)
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSurvivalCurves([])}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white rounded p-3 mb-4">
                            <p className="text-sm font-medium mb-2">Selected Groups:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedSurvivalCurves.map((group, idx) => (
                                <div key={idx} className="px-3 py-1 bg-blue-100 rounded text-sm">
                                  {group}
                                </div>
                              ))}
                            </div>
                          </div>
                          {!logRankTestResult ? (
                            <Button
                              onClick={runLogRankTest}
                              disabled={runningLogRank}
                              className="w-full"
                            >
                              {runningLogRank ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Running log-rank test...
                                </>
                              ) : (
                                "Run Log-Rank Test"
                              )}
                            </Button>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded p-4">
                                <h3 className="font-semibold text-lg mb-3">Log-Rank Test Results</h3>

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-gray-600">Test Statistic (χ²)</p>
                                    <p className="text-xl font-bold">
                                      {logRankTestResult.test_statistic?.toFixed(4) || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">P-value</p>
                                    <p className={`text-xl font-bold ${logRankTestResult.p_value < 0.05 ? "text-red-600" : "text-gray-900"}`}>
                                      {logRankTestResult.p_value?.toFixed(6) || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Degrees of Freedom</p>
                                  <p className="font-semibold">{logRankTestResult.degrees_of_freedom}</p>
                                </div>

                                <div className={`mt-3 p-3 rounded ${logRankTestResult.significant ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-800"}`}>
                                  {logRankTestResult.significant ? "✓ Statistically significant (p < 0.05)" : "Not significant (p ≥ 0.05)"}
                                </div>

                                {logRankTestResult.interpretation && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
                                    {logRankTestResult.interpretation}
                                  </div>
                                )}
                              </div>

                              <Button variant="outline" onClick={() => setLogRankTestResult(null)} className="w-full">
                                Run Another Test
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select at least one factor to display survival curves
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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {reproductionFacetLevels.map(level => {
                        const facetData = getReproductionChartData(level);
                        return (
                          <div key={level} className="border rounded-lg p-4">
                            <h3 className="text-center font-semibold mb-3">{facetReproductionFactor}: {level}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={facetData} onClick={(e) => e?.activePayload?.[0] && handleReproductionBarClick(e.activePayload[0].payload)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                                <Legend />
                                <Bar dataKey="reproduced" stackId="a" name="Reproduced" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedReproductionBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                                      opacity={selectedReproductionBars.length > 0 && !selectedReproductionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="notReproduced" stackId="a" name="Not Reproduced" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedReproductionBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                                      opacity={selectedReproductionBars.length > 0 && !selectedReproductionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
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
              <CardTitle>Red Signal by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`red-signal-graph-${factor.name}`}
                          checked={selectedRedSignalGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleRedSignalGraphFactor(factor.name)}
                          disabled={facetRedSignalFactor === factor.name}
                        />
                        <label htmlFor={`red-signal-graph-${factor.name}`} className="text-sm cursor-pointer">
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
                    value={facetRedSignalFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetRedSignalFactor(value);
                      if (value && selectedRedSignalGraphFactors.includes(value)) {
                        setSelectedRedSignalGraphFactors(selectedRedSignalGraphFactors.filter(f => f !== value));
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

              {selectedRedSignalGraphFactors.length > 0 ? (
                !facetRedSignalFactor ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={redSignalChartData} onClick={(e) => e?.activePayload?.[0] && handleRedSignalBarClick(e.activePayload[0].payload)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                        <Legend />
                        <Bar dataKey="redConfirmed" stackId="a" name="Red Confirmed" cursor="pointer">
                          {redSignalChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                              opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="notRedConfirmed" stackId="a" name="Not Red Confirmed" cursor="pointer">
                          {redSignalChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#4b5563" : "#6b7280"}
                              opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedRedSignalBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedRedSignalBars}
                          onClear={() => setSelectedRedSignalBars([])}
                          chartType="red_signal"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {redSignalFacetLevels.map(level => {
                        const facetData = getRedSignalChartData(level);
                        return (
                          <div key={level} className="border rounded-lg p-4">
                            <h3 className="text-center font-semibold mb-3">{facetRedSignalFactor}: {level}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={facetData} onClick={(e) => e?.activePayload?.[0] && handleRedSignalBarClick(e.activePayload[0].payload)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                                <Legend />
                                <Bar dataKey="redConfirmed" stackId="a" name="Red Confirmed" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                                      opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="notRedConfirmed" stackId="a" name="Not Red Confirmed" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#4b5563" : "#6b7280"}
                                      opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedRedSignalBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedRedSignalBars}
                          onClear={() => setSelectedRedSignalBars([])}
                          chartType="red_signal"
                        />
                      </div>
                    )}
                  </>
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
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {infectionFacetLevels.map(level => {
                        const facetData = getInfectionChartData(level);
                        return (
                          <div key={level} className="border rounded-lg p-4">
                            <h3 className="text-center font-semibold mb-3">{facetInfectionFactor}: {level}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={facetData} onClick={(e) => e?.activePayload?.[0] && handleInfectionBarClick(e.activePayload[0].payload)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                                <Legend />
                                <Bar dataKey="confirmedYes" stackId="a" name="Confirmed Yes" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedInfectionBars.find(b => b.name === entry.name) ? "#dc2626" : "#ef4444"}
                                      opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="confirmedNo" stackId="a" name="Confirmed No" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedInfectionBars.find(b => b.name === entry.name) ? "#16a34a" : "#22c55e"}
                                      opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                {!excludeNotTested && (
                                  <Bar dataKey="notTested" stackId="a" name="Not Tested" cursor="pointer">
                                    {facetData.map((entry, index) => (
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
                          </div>
                        );
                      })}
                    </div>
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