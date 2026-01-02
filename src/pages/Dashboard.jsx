import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Skull, Droplet, Syringe, X, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useExperiment } from "../components/ExperimentContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, ComposedChart, Scatter, ZAxis, ErrorBar } from 'recharts';
import StatisticalTestPanel from "../components/dashboard/StatisticalTestPanel";
import { oneWayAnova, tukeyHSD, logRankTest, multiWayAnova } from "../components/dashboard/statisticsUtils";

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
  const [includePartialRedSignals, setIncludePartialRedSignals] = useState(false);
  const [excludeMales, setExcludeMales] = useState(false);
  const [selectedSexGraphFactors, setSelectedSexGraphFactors] = useState([]);
  const [facetSexFactor, setFacetSexFactor] = useState(null);
  const [selectedSexBars, setSelectedSexBars] = useState([]);
  const [selectedOffspringGraphFactors, setSelectedOffspringGraphFactors] = useState([]);
  const [facetOffspringFactor, setFacetOffspringFactor] = useState(null);
  const [offspringByRedStatus, setOffspringByRedStatus] = useState(false);
  const [survivalByRedStatus, setSurvivalByRedStatus] = useState(false);
  const [survivalCurveByRedStatus, setSurvivalCurveByRedStatus] = useState(false);
  const [survivalCurveByInfectionStatus, setSurvivalCurveByInfectionStatus] = useState(false);
  const [selectedSporeLoadGraphFactors, setSelectedSporeLoadGraphFactors] = useState([]);
  const [facetSporeLoadFactor, setFacetSporeLoadFactor] = useState(null);
  const [excludeZeroSporeLoad, setExcludeZeroSporeLoad] = useState(false);
  const [anovaFactors, setAnovaFactors] = useState([]);
  const [anovaResult, setAnovaResult] = useState(null);
  const [runningAnova, setRunningAnova] = useState(false);

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
    const categoryMatch = Object.entries(categoryFilters).every(([key, value]) => 
      value === 'all' || ind.factors?.[key] === value
    );
    const sexMatch = !excludeMales || ind.sex !== 'male';
    return categoryMatch && sexMatch;
  });

  const stats = {
    total: filteredIndividuals.length,
    alive: filteredIndividuals.filter(i => i.alive).length,
    dead: filteredIndividuals.filter(i => !i.alive).length,
    infected: filteredIndividuals.filter(i => i.infected === "confirmed Yes").length,
    redConfirmed: filteredIndividuals.filter(i => i.red_confirmed).length,
    redConfirmedAlive: filteredIndividuals.filter(i => i.red_confirmed && i.alive).length,
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

  const toggleSexGraphFactor = (factorName) => {
    setSelectedSexGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleOffspringGraphFactor = (factorName) => {
    setSelectedOffspringGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleSporeLoadGraphFactor = (factorName) => {
    setSelectedSporeLoadGraphFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const getChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedGraphFactors.length === 0) return [];

    const groups = {};
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
    filteredInds.forEach(ind => {
      let groupKey = selectedGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      // Add red status to group key if enabled
      if (survivalByRedStatus) {
        const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
        groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
      }
      
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
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetInfectionFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
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
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetReproductionFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
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
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetRedSignalFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
    filteredInds.forEach(ind => {
      const groupKey = selectedRedSignalGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, red3plus: 0, red2: 0, red1: 0, noRed: 0 };
      }
      
      const signalCount = ind.red_signal_count || 0;
      if (signalCount >= 3) {
        groups[groupKey].red3plus++;
      } else if (signalCount === 2) {
        groups[groupKey].red2++;
      } else if (signalCount === 1) {
        groups[groupKey].red1++;
      } else {
        groups[groupKey].noRed++;
      }
    });

    return Object.values(groups).map(group => {
      const total = group.red3plus + group.red2 + group.red1 + group.noRed;
      return {
        name: group.name,
        red3plus: total > 0 ? (group.red3plus / total) * 100 : 0,
        red2: total > 0 ? (group.red2 / total) * 100 : 0,
        red1: total > 0 ? (group.red1 / total) * 100 : 0,
        noRed: total > 0 ? (group.noRed / total) * 100 : 0,
        total: total,
        red3plusCount: group.red3plus,
        red2Count: group.red2,
        red1Count: group.red1,
        noRedCount: group.noRed
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getRedSignalFacetLevels = () => {
    if (!facetRedSignalFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetRedSignalFactor);
    return factor?.levels || [];
  };

  const getSexChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedSexGraphFactors.length === 0) return [];

    const groups = {};
    
    const filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetSexFactor] === filterByFacet)
      : allIndividuals;
    
    filteredInds.forEach(ind => {
      const groupKey = selectedSexGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, male: 0, female: 0 };
      }
      
      const sex = ind.sex || 'female';
      groups[groupKey][sex]++;
    });

    return Object.values(groups).map(group => {
      const total = group.male + group.female;
      return {
        name: group.name,
        male: total > 0 ? (group.male / total) * 100 : 0,
        female: total > 0 ? (group.female / total) * 100 : 0,
        total: total,
        maleCount: group.male,
        femaleCount: group.female
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSexFacetLevels = () => {
    if (!facetSexFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetSexFactor);
    return factor?.levels || [];
  };

  const getOffspringChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedOffspringGraphFactors.length === 0) return { boxData: [], scatterData: [] };

    const groups = {};
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetOffspringFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
    filteredInds.forEach(ind => {
      let groupKey = selectedOffspringGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      // Add red status to group key if enabled
      if (offspringByRedStatus) {
        const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
        groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, values: [] };
      }
      
      const offspring = Number(ind.cumulative_offspring) || 0;
      groups[groupKey].values.push(offspring);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    
    // Calculate boxplot statistics for each group
    const boxData = sortedGroups.map((group, idx) => {
      const values = [...group.values].sort((a, b) => a - b);
      const n = values.length;
      if (n === 0) return { name: group.name, min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, std: 0, se: 0, ci95: 0, n: 0 };
      
      const min = values[0];
      const max = values[n - 1];
      const median = n % 2 === 0 ? (values[n/2 - 1] + values[n/2]) / 2 : values[Math.floor(n/2)];
      const q1Idx = Math.floor(n * 0.25);
      const q3Idx = Math.floor(n * 0.75);
      const q1 = values[q1Idx];
      const q3 = values[q3Idx];
      const mean = values.reduce((a, b) => a + b, 0) / n;
      
      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
      const std = Math.sqrt(variance);
      
      // Standard error and 95% CI
      const se = std / Math.sqrt(n);
      const ci95 = 1.96 * se;
      
      return { name: group.name, min, q1, median, q3, max, mean, std, se, ci95, n, idx };
    });

    // Create scatter data for individual points with jitter
    const scatterData = [];
    sortedGroups.forEach((group, groupIdx) => {
      group.values.forEach((value, i) => {
        scatterData.push({
          name: group.name,
          x: groupIdx + (Math.random() - 0.5) * 0.3, // Add jitter
          y: value,
          groupIdx
        });
      });
    });

    return { boxData, scatterData, groupNames: sortedGroups.map(g => g.name) };
  };

  const getOffspringFacetLevels = () => {
    if (!facetOffspringFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetOffspringFactor);
    return factor?.levels || [];
  };

  const parseVolume = (volumeStr) => {
    if (!volumeStr) return null;
    const match = volumeStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  };

  const getSporeLoadChartData = (filterByFacet = null) => {
    if (!experiment?.factors || selectedSporeLoadGraphFactors.length === 0) return { boxData: [] };

    const groups = {};
    
    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetSporeLoadFactor] === filterByFacet)
      : allIndividuals;
    
    if (excludeMales) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    
    // Only include infected individuals with spore data
    filteredInds = filteredInds.filter(ind => 
      ind.infected === 'confirmed Yes' && 
      ind.spores_count != null && 
      ind.spores_volume
    );
    
    filteredInds.forEach(ind => {
      const groupKey = selectedSporeLoadGraphFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, values: [] };
      }
      
      const volume = parseVolume(ind.spores_volume);
      if (volume && ind.spores_count != null) {
        const sporeLoad = ind.spores_count * volume;
        if (!excludeZeroSporeLoad || sporeLoad > 0) {
          groups[groupKey].values.push(sporeLoad);
        }
      }
    });

    const sortedGroups = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    
    const boxData = sortedGroups.map((group, idx) => {
      const values = [...group.values].sort((a, b) => a - b);
      const n = values.length;
      if (n === 0) return { name: group.name, min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, std: 0, se: 0, ci95: 0, n: 0 };
      
      const min = values[0];
      const max = values[n - 1];
      const median = n % 2 === 0 ? (values[n/2 - 1] + values[n/2]) / 2 : values[Math.floor(n/2)];
      const mean = values.reduce((a, b) => a + b, 0) / n;
      
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
      const std = Math.sqrt(variance);
      const se = std / Math.sqrt(n);
      const ci95 = 1.96 * se;
      
      return { name: group.name, min, median, max, mean, std, se, ci95, n, idx };
    });

    return { boxData };
  };

  const getSporeLoadFacetLevels = () => {
    if (!facetSporeLoadFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetSporeLoadFactor);
    return factor?.levels || [];
  };

  const runAnovaTest = () => {
    if (anovaFactors.length === 0) return;

    setRunningAnova(true);
    setAnovaResult(null);

    try {
      let filteredInds = excludeMales 
        ? allIndividuals.filter(ind => ind.sex !== 'male')
        : allIndividuals;

      if (anovaFactors.length === 1) {
        // One-way ANOVA
        const groups = {};
        const factor = anovaFactors[0];

        filteredInds.forEach(ind => {
          const groupKey = ind.factors?.[factor] || 'Unknown';
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(Number(ind.cumulative_offspring) || 0);
        });

        const anovaResults = oneWayAnova(groups);

        // Perform Tukey HSD if significant
        let postHoc = [];
        if (anovaResults.significant) {
          postHoc = tukeyHSD(groups, anovaResults.ms_within, anovaResults.df_within);
        }

        setAnovaResult({
          ...anovaResults,
          post_hoc: postHoc,
          isMultiWay: false,
          interpretation: anovaResults.significant 
            ? `Significant effect of ${factor} on offspring count (F(${anovaResults.df_between},${anovaResults.df_within}) = ${anovaResults.f_statistic.toFixed(2)}, p = ${anovaResults.p_value.toFixed(4)})`
            : `No significant effect of ${factor} on offspring count (p = ${anovaResults.p_value.toFixed(4)})`
        });
      } else {
        // Multi-way ANOVA
        const data = filteredInds.map(ind => {
          const row = { value: Number(ind.cumulative_offspring) || 0 };
          anovaFactors.forEach(factor => {
            row[factor] = ind.factors?.[factor] || 'Unknown';
          });
          return row;
        });

        const results = multiWayAnova(data, anovaFactors);

        // Separate main effects and interactions
        const mainEffects = results.effects.filter(e => e.type === 'main');
        const interactions = results.effects.filter(e => e.type === 'interaction');

        setAnovaResult({
          isMultiWay: true,
          test_type: `${anovaFactors.length}-way ANOVA`,
          main_effects: mainEffects.map(e => ({
            factor: e.factor,
            f_statistic: e.f_statistic,
            df: e.df,
            p_value: e.p_value,
            eta_squared: e.eta_squared,
            significant: e.significant
          })),
          interactions: interactions.map(e => ({
            factors: e.factors,
            f_statistic: e.f_statistic,
            df: e.df,
            p_value: e.p_value,
            eta_squared: e.eta_squared,
            significant: e.significant
          })),
          df_error: results.df_error,
          ms_error: results.ms_error,
          interpretation: `${anovaFactors.length}-way ANOVA with ${interactions.length} interaction term(s)`
        });
      }
    } catch (error) {
      alert('ANOVA test failed: ' + error.message);
    } finally {
      setRunningAnova(false);
    }
  };

  const getSurvivalCurveData = (infectionFilter = null) => {
    if (!experiment?.factors || selectedSurvivalCurveFactors.length === 0 || !experiment?.start_date) return [];

    const groups = {};
    let maxDay = 0;
    
    let filteredInds = excludeMales 
      ? allIndividuals.filter(ind => ind.sex !== 'male')
      : allIndividuals;
    
    // Filter by infection status if specified
    if (infectionFilter) {
      filteredInds = filteredInds.filter(ind => ind.infected === infectionFilter);
    }
    
    // Calculate the maximum observation time (current date or last death, whichever is later)
    const currentDay = differenceInDays(new Date(), new Date(experiment.start_date));
    
    filteredInds.forEach(ind => {
      let groupKey = selectedSurvivalCurveFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      // Add red status to group key if enabled
      if (survivalCurveByRedStatus) {
        const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
        groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      if (ind.death_date) {
        const daysSinceStart = differenceInDays(new Date(ind.death_date), new Date(experiment.start_date));
        groups[groupKey].push({ day: daysSinceStart, event: 'death' });
        maxDay = Math.max(maxDay, daysSinceStart);
      } else {
        // For censored (alive), use current time for censoring
        groups[groupKey].push({ day: currentDay, event: 'censored' });
      }
    });
    
    // Extend maxDay to at least the current observation time
    maxDay = Math.max(maxDay, currentDay);

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

  const runLogRankTest = () => {
    setRunningLogRank(true);
    setLogRankTestResult(null);
    
    try {
      // Prepare survival data for selected groups
      const survivalData = {};
      
      let filteredInds = excludeMales 
        ? allIndividuals.filter(ind => ind.sex !== 'male')
        : allIndividuals;
      
      filteredInds.forEach(ind => {
        let groupKey = selectedSurvivalCurveFactors
          .map(factor => ind.factors?.[factor] || 'Unknown')
          .join(' - ');
        
        if (survivalCurveByRedStatus) {
          const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
          groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
        }
        
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

      const result = logRankTest(survivalData);
      
      setLogRankTestResult({
        ...result,
        interpretation: result.significant
          ? `Survival curves differ significantly between groups (χ² = ${result.test_statistic.toFixed(2)}, df = ${result.degrees_of_freedom}, p = ${result.p_value.toFixed(4)})`
          : `No significant difference in survival between groups (p = ${result.p_value.toFixed(4)})`
      });
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
  const survivalCurveData = !survivalCurveByInfectionStatus ? getSurvivalCurveData() : null;
  const redSignalChartData = !facetRedSignalFactor ? getRedSignalChartData() : null;
  const redSignalFacetLevels = getRedSignalFacetLevels();
  const sexChartData = !facetSexFactor ? getSexChartData() : null;
  const sexFacetLevels = getSexFacetLevels();
  const offspringChartResult = !facetOffspringFactor ? getOffspringChartData() : null;
  const offspringFacetLevels = getOffspringFacetLevels();
  const sporeLoadChartResult = !facetSporeLoadFactor ? getSporeLoadChartData() : null;
  const sporeLoadFacetLevels = getSporeLoadFacetLevels();

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
          red3plus: data.red3plusCount || 0,
          red2: data.red2Count || 0,
          red1: data.red1Count || 0,
          noRed: data.noRedCount || 0,
          total: data.total
        }
      }]);
    }
  };

  const handleSexBarClick = (data) => {
    if (!data) return;
    const barName = data.name;
    const existing = selectedSexBars.find(b => b.name === barName);
    
    if (existing) {
      setSelectedSexBars(selectedSexBars.filter(b => b.name !== barName));
    } else {
      setSelectedSexBars([...selectedSexBars, {
        name: barName,
        data: {
          male: data.maleCount || 0,
          female: data.femaleCount || 0,
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

                <Card className="mb-6">
                <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                <Checkbox
                  id="exclude-males"
                  checked={excludeMales}
                  onCheckedChange={setExcludeMales}
                />
                <label htmlFor="exclude-males" className="text-sm font-medium cursor-pointer">
                  Exclude males from all graphs and statistics
                </label>
                </div>
                </CardContent>
                </Card>

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
                    <div className="text-3xl font-bold text-red-600">
                      {stats.redConfirmedAlive} / {stats.redConfirmed}
                    </div>
                    <div className="text-sm text-gray-500">
                      {stats.redConfirmed > 0 ? ((stats.redConfirmedAlive / stats.redConfirmed) * 100).toFixed(1) : 0}% alive
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
              <CardTitle>Category Summary Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="text-sm font-medium block mb-2">Select factor to summarize:</label>
                <select
                  className="border rounded p-2 text-sm"
                  onChange={(e) => {
                    const factor = e.target.value;
                    if (!factor) return;
                    const summary = {};
                    const factor_obj = experiment.factors.find(f => f.name === factor);

                    factor_obj.levels.forEach(level => {
                      const inds = filteredIndividuals.filter(ind => ind.factors?.[factor] === level);
                      const redCount = inds.filter(ind => ind.red_confirmed).length;
                      summary[level] = {
                        total: inds.length,
                        red: redCount,
                        nonRed: inds.length - redCount
                      };
                    });

                    // Display table
                    const table = document.getElementById('category-summary-table');
                    table.innerHTML = `
                      <thead>
                        <tr class="bg-gray-50 border-b">
                          <th class="p-3 text-left font-semibold">${factor}</th>
                          <th class="p-3 text-right font-semibold">Total</th>
                          <th class="p-3 text-right font-semibold">Red Confirmed</th>
                          <th class="p-3 text-right font-semibold">Non-Red</th>
                          <th class="p-3 text-right font-semibold">% Red</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${factor_obj.levels.map(level => {
                          const data = summary[level];
                          const pctRed = data.total > 0 ? ((data.red / data.total) * 100).toFixed(1) : '0.0';
                          return `
                            <tr class="border-b hover:bg-gray-50">
                              <td class="p-3 font-medium">${level}</td>
                              <td class="p-3 text-right">${data.total}</td>
                              <td class="p-3 text-right text-red-600 font-semibold">${data.red}</td>
                              <td class="p-3 text-right">${data.nonRed}</td>
                              <td class="p-3 text-right">${pctRed}%</td>
                            </tr>
                          `;
                        }).join('')}
                        <tr class="bg-gray-100 font-semibold">
                          <td class="p-3">Total</td>
                          <td class="p-3 text-right">${filteredIndividuals.length}</td>
                          <td class="p-3 text-right text-red-600">${filteredIndividuals.filter(ind => ind.red_confirmed).length}</td>
                          <td class="p-3 text-right">${filteredIndividuals.filter(ind => !ind.red_confirmed).length}</td>
                          <td class="p-3 text-right">${filteredIndividuals.length > 0 ? ((filteredIndividuals.filter(ind => ind.red_confirmed).length / filteredIndividuals.length) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      </tbody>
                    `;
                  }}
                >
                  <option value="">-- Select a factor --</option>
                  {experiment.factors?.map(factor => (
                    <option key={factor.name} value={factor.name}>
                      {factor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table id="category-summary-table" className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="p-8 text-center text-gray-500">Select a factor above to view summary</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Total Offspring by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`offspring-graph-${factor.name}`}
                          checked={selectedOffspringGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleOffspringGraphFactor(factor.name)}
                          disabled={facetOffspringFactor === factor.name}
                        />
                        <label htmlFor={`offspring-graph-${factor.name}`} className="text-sm cursor-pointer">
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
                    value={facetOffspringFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetOffspringFactor(value);
                      if (value && selectedOffspringGraphFactors.includes(value)) {
                        setSelectedOffspringGraphFactors(selectedOffspringGraphFactors.filter(f => f !== value));
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
                    id="offspring-by-red"
                    checked={offspringByRedStatus}
                    onCheckedChange={setOffspringByRedStatus}
                  />
                  <label htmlFor="offspring-by-red" className="text-sm cursor-pointer">
                    Differentiate by red status (Red+ vs Red-)
                  </label>
                </div>
              </div>

              {selectedOffspringGraphFactors.length > 0 ? (
                !facetOffspringFactor ? (
                  <div>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart 
                        data={offspringChartResult.boxData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name"
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          interval={0}
                        />
                        <YAxis label={{ value: 'Mean Offspring ± 95% CI', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border rounded p-2 shadow text-sm">
                                  <p className="font-semibold">{data.name}</p>
                                  <p>n = {data.n}</p>
                                  <p>Mean: {data.mean?.toFixed(2)}</p>
                                  <p>SD: {data.std?.toFixed(2)}</p>
                                  <p>SE: {data.se?.toFixed(2)}</p>
                                  <p>95% CI: [{(data.mean - data.ci95)?.toFixed(2)}, {(data.mean + data.ci95)?.toFixed(2)}]</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="mean" fill="#10b981" name="Mean Offspring">
                          <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#065f46" />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                    {/* Group statistics table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="p-2 text-left">Group</th>
                            <th className="p-2 text-right">n</th>
                            <th className="p-2 text-right">Mean</th>
                            <th className="p-2 text-right">SD</th>
                            <th className="p-2 text-right">SE</th>
                            <th className="p-2 text-right">95% CI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offspringChartResult.boxData.map((box) => (
                            <tr key={box.name} className="border-b">
                              <td className="p-2 font-medium">{box.name}</td>
                              <td className="p-2 text-right">{box.n}</td>
                              <td className="p-2 text-right">{box.mean?.toFixed(2)}</td>
                              <td className="p-2 text-right">{box.std?.toFixed(2)}</td>
                              <td className="p-2 text-right">{box.se?.toFixed(2)}</td>
                              <td className="p-2 text-right">[{(box.mean - box.ci95)?.toFixed(2)}, {(box.mean + box.ci95)?.toFixed(2)}]</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offspringFacetLevels.map(level => {
                      const facetResult = getOffspringChartData(level);
                      return (
                        <div key={level} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetOffspringFactor}: {level}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart 
                              data={facetResult.boxData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name"
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                fontSize={12}
                                interval={0}
                              />
                              <YAxis fontSize={12} label={{ value: 'Mean ± 95% CI', angle: -90, position: 'insideLeft' }} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white border rounded p-2 shadow text-xs">
                                        <p className="font-semibold">{data.name}</p>
                                        <p>n={data.n}, Mean={data.mean?.toFixed(2)} ± {data.ci95?.toFixed(2)}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="mean" fill="#10b981" name="Mean">
                                <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#065f46" />
                              </Bar>
                            </ComposedChart>
                          </ResponsiveContainer>
                          <div className="flex justify-around text-xs mt-2">
                            {facetResult.boxData.map((box) => (
                              <div key={box.name} className="text-center">
                                <div className="text-gray-500">n={box.n}, μ={box.mean?.toFixed(1)} ± {box.ci95?.toFixed(1)}</div>
                              </div>
                            ))}
                          </div>
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

              <div className="mt-6 border-t pt-6">
                <h3 className="font-semibold mb-4">ANOVA Test for Offspring</h3>
                <div className="mb-4">
                  <label className="text-sm font-medium block mb-2">Select factor(s) to test:</label>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`anova-${factor.name}`}
                          checked={anovaFactors.includes(factor.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAnovaFactors([...anovaFactors, factor.name]);
                            } else {
                              setAnovaFactors(anovaFactors.filter(f => f !== factor.name));
                            }
                            setAnovaResult(null);
                          }}
                        />
                        <label htmlFor={`anova-${factor.name}`} className="text-sm cursor-pointer">
                          {factor.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {anovaFactors.length === 0 && "Select at least one factor"}
                    {anovaFactors.length === 1 && "One-way ANOVA"}
                    {anovaFactors.length === 2 && "Two-way ANOVA (with interaction)"}
                    {anovaFactors.length === 3 && "Three-way ANOVA (with interactions)"}
                    {anovaFactors.length > 3 && "Multi-way ANOVA (max 3 factors supported)"}
                  </div>
                  <Button 
                    onClick={runAnovaTest} 
                    disabled={anovaFactors.length === 0 || anovaFactors.length > 3 || runningAnova}
                  >
                    {runningAnova ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running ANOVA...
                      </>
                    ) : (
                      "Run ANOVA"
                    )}
                  </Button>
                </div>

                {anovaResult && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-green-800">
                          {anovaResult.isMultiWay 
                            ? `${anovaResult.test_type || 'Multi-way ANOVA'} Results (${anovaFactors.join(' × ')})`
                            : `One-Way ANOVA Results (${anovaFactors[0]})`
                          }
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setAnovaResult(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {anovaResult.isMultiWay ? (
                        <>
                          {/* Main Effects */}
                          <div className="bg-white rounded p-4">
                            <h4 className="font-semibold mb-3">Main Effects</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2">Factor</th>
                                    <th className="text-left p-2">F</th>
                                    <th className="text-left p-2">df</th>
                                    <th className="text-left p-2">p-value</th>
                                    <th className="text-left p-2">η²</th>
                                    <th className="text-left p-2">Sig.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {anovaResult.main_effects?.map((effect, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-2 font-medium">{effect.factor}</td>
                                      <td className="p-2">{effect.f_statistic?.toFixed(3)}</td>
                                      <td className="p-2">{effect.df}</td>
                                      <td className={`p-2 ${effect.p_value < 0.05 ? "text-red-600 font-semibold" : ""}`}>
                                        {effect.p_value?.toFixed(4)}
                                      </td>
                                      <td className="p-2">{effect.eta_squared?.toFixed(4)}</td>
                                      <td className="p-2">{effect.significant ? "✓" : ""}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Interactions */}
                          {anovaResult.interactions && anovaResult.interactions.length > 0 && (
                            <div className="bg-white rounded p-4">
                              <h4 className="font-semibold mb-3">Interaction Effects</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Interaction</th>
                                      <th className="text-left p-2">F</th>
                                      <th className="text-left p-2">df</th>
                                      <th className="text-left p-2">p-value</th>
                                      <th className="text-left p-2">η²</th>
                                      <th className="text-left p-2">Sig.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {anovaResult.interactions.map((interaction, idx) => (
                                      <tr key={idx} className="border-b">
                                        <td className="p-2 font-medium">{interaction.factors?.join(' × ')}</td>
                                        <td className="p-2">{interaction.f_statistic?.toFixed(3)}</td>
                                        <td className="p-2">{interaction.df}</td>
                                        <td className={`p-2 ${interaction.p_value < 0.05 ? "text-red-600 font-semibold" : ""}`}>
                                          {interaction.p_value?.toFixed(4)}
                                        </td>
                                        <td className="p-2">{interaction.eta_squared?.toFixed(4)}</td>
                                        <td className="p-2">{interaction.significant ? "✓" : ""}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="bg-white rounded p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600">F-statistic</p>
                                <p className="text-xl font-bold">
                                  {anovaResult.f_statistic?.toFixed(4) || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">P-value</p>
                                <p className={`text-xl font-bold ${anovaResult.p_value < 0.05 ? "text-red-600" : "text-gray-900"}`}>
                                  {anovaResult.p_value?.toFixed(6) || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">df (between, within)</p>
                                <p className="text-xl font-bold">
                                  {anovaResult.df_between}, {anovaResult.df_within}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Effect Size (η²)</p>
                                <p className="text-xl font-bold">
                                  {anovaResult.eta_squared?.toFixed(4) || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div className={`p-3 rounded ${anovaResult.significant ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-800"}`}>
                              {anovaResult.significant ? "✓ Statistically significant (p < 0.05)" : "Not significant (p ≥ 0.05)"}
                            </div>
                          </div>

                          {anovaResult.group_stats && (
                            <div className="bg-white rounded p-4">
                              <h4 className="font-semibold mb-3">Group Statistics</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Group</th>
                                      <th className="text-left p-2">N</th>
                                      <th className="text-left p-2">Mean</th>
                                      <th className="text-left p-2">Std Dev</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {anovaResult.group_stats.map((stat, idx) => (
                                      <tr key={idx} className="border-b">
                                        <td className="p-2 font-medium">{stat.name}</td>
                                        <td className="p-2">{stat.n}</td>
                                        <td className="p-2">{stat.mean?.toFixed(2)}</td>
                                        <td className="p-2">{stat.std?.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {anovaResult.post_hoc && anovaResult.post_hoc.length > 0 && (
                            <div className="bg-white rounded p-4">
                              <h4 className="font-semibold mb-3">Post-hoc Comparisons (Tukey HSD)</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Comparison</th>
                                      <th className="text-left p-2">Mean Diff</th>
                                      <th className="text-left p-2">p-value</th>
                                      <th className="text-left p-2">Sig.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {anovaResult.post_hoc.map((pair, idx) => (
                                      <tr key={idx} className={`border-b ${pair.significant ? "bg-red-50" : ""}`}>
                                        <td className="p-2 font-medium">{pair.group1} vs {pair.group2}</td>
                                        <td className="p-2">{pair.mean_diff?.toFixed(2)}</td>
                                        <td className={`p-2 ${pair.significant ? "text-red-600 font-semibold" : ""}`}>
                                          {pair.p_value?.toFixed(4)}
                                        </td>
                                        <td className="p-2">{pair.significant ? "✓ *" : ""}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {anovaResult.interpretation && (
                        <div className="bg-blue-50 rounded p-3 text-sm text-blue-900">
                          {anovaResult.interpretation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="survival-by-red"
                    checked={survivalByRedStatus}
                    onCheckedChange={setSurvivalByRedStatus}
                  />
                  <label htmlFor="survival-by-red" className="text-sm cursor-pointer">
                    Differentiate by red status (Red+ vs Red-)
                  </label>
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

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="survival-curve-by-red"
                    checked={survivalCurveByRedStatus}
                    onCheckedChange={setSurvivalCurveByRedStatus}
                  />
                  <label htmlFor="survival-curve-by-red" className="text-sm cursor-pointer">
                    Differentiate by red status (Red+ vs Red-)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="survival-curve-by-infection"
                    checked={survivalCurveByInfectionStatus}
                    onCheckedChange={setSurvivalCurveByInfectionStatus}
                  />
                  <label htmlFor="survival-curve-by-infection" className="text-sm cursor-pointer">
                    Differentiate by infection status (Infected vs Not Infected) - excludes not tested
                  </label>
                </div>
              </div>

              {selectedSurvivalCurveFactors.length > 0 ? (
                !survivalCurveByInfectionStatus ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['confirmed Yes', 'confirmed No'].map(infectionStatus => {
                      const facetData = getSurvivalCurveData(infectionStatus);
                      const facetLabel = infectionStatus === 'confirmed Yes' ? 'Infected' : 'Not Infected';
                      return (
                        <div key={infectionStatus} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetLabel}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={facetData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="day" 
                                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                                fontSize={12}
                              />
                              <YAxis 
                                label={{ value: 'Survival (%)', angle: -90, position: 'insideLeft' }}
                                domain={[0, 100]}
                                fontSize={12}
                              />
                              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                              <Legend 
                                onClick={(e) => handleSurvivalCurveClick(e.value)}
                                wrapperStyle={{ cursor: 'pointer' }}
                              />
                              {Object.keys(facetData[0] || {})
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
                        </div>
                      );
                    })}
                  </div>
                )
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
                        <Bar dataKey="red3plus" stackId="a" name="3+ signals (confirmed)" cursor="pointer">
                          {redSignalChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#991b1b" : "#dc2626"}
                              opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="red2" stackId="a" name="2 signals" cursor="pointer">
                          {redSignalChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#c2410c" : "#f97316"}
                              opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="red1" stackId="a" name="1 signal" cursor="pointer">
                          {redSignalChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#ca8a04" : "#facc15"}
                              opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="noRed" stackId="a" name="No signal" cursor="pointer">
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
                                <Bar dataKey="red3plus" stackId="a" name="3+ signals" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#991b1b" : "#dc2626"}
                                      opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="red2" stackId="a" name="2 signals" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#c2410c" : "#f97316"}
                                      opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="red1" stackId="a" name="1 signal" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedRedSignalBars.find(b => b.name === entry.name) ? "#ca8a04" : "#facc15"}
                                      opacity={selectedRedSignalBars.length > 0 && !selectedRedSignalBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="noRed" stackId="a" name="No signal" cursor="pointer">
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
              <CardTitle>Sex Distribution by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`sex-graph-${factor.name}`}
                          checked={selectedSexGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleSexGraphFactor(factor.name)}
                          disabled={facetSexFactor === factor.name}
                        />
                        <label htmlFor={`sex-graph-${factor.name}`} className="text-sm cursor-pointer">
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
                    value={facetSexFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetSexFactor(value);
                      if (value && selectedSexGraphFactors.includes(value)) {
                        setSelectedSexGraphFactors(selectedSexGraphFactors.filter(f => f !== value));
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

              {selectedSexGraphFactors.length > 0 ? (
                !facetSexFactor ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={sexChartData} onClick={(e) => e?.activePayload?.[0] && handleSexBarClick(e.activePayload[0].payload)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                        <Legend />
                        <Bar dataKey="male" stackId="a" name="Male" cursor="pointer">
                          {sexChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedSexBars.find(b => b.name === entry.name) ? "#ea580c" : "#f97316"}
                              opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="female" stackId="a" name="Female" cursor="pointer">
                          {sexChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={selectedSexBars.find(b => b.name === entry.name) ? "#78350f" : "#92400e"}
                              opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === entry.name) ? 0.3 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-gray-600 text-center">
                      Click on bars to select groups for statistical testing
                    </div>
                    {selectedSexBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedSexBars}
                          onClear={() => setSelectedSexBars([])}
                          chartType="sex"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sexFacetLevels.map(level => {
                        const facetData = getSexChartData(level);
                        return (
                          <div key={level} className="border rounded-lg p-4">
                            <h3 className="text-center font-semibold mb-3">{facetSexFactor}: {level}</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={facetData} onClick={(e) => e?.activePayload?.[0] && handleSexBarClick(e.activePayload[0].payload)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                <YAxis fontSize={12} label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip formatter={(value, name) => [`${value.toFixed(1)}%`, name]} />
                                <Legend />
                                <Bar dataKey="male" stackId="a" name="Male" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedSexBars.find(b => b.name === entry.name) ? "#ea580c" : "#f97316"}
                                      opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === entry.name) ? 0.3 : 1}
                                    />
                                  ))}
                                </Bar>
                                <Bar dataKey="female" stackId="a" name="Female" cursor="pointer">
                                  {facetData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={selectedSexBars.find(b => b.name === entry.name) ? "#78350f" : "#92400e"}
                                      opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === entry.name) ? 0.3 : 1}
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
                    {selectedSexBars.length > 0 && (
                      <div className="mt-4">
                        <StatisticalTestPanel
                          selectedBars={selectedSexBars}
                          onClear={() => setSelectedSexBars([])}
                          chartType="sex"
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Spore Load by Category (Infected Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Select factors to group by:</p>
                  <div className="flex flex-wrap gap-4">
                    {experiment.factors?.map(factor => (
                      <div key={factor.name} className="flex items-center gap-2">
                        <Checkbox
                          id={`spore-load-graph-${factor.name}`}
                          checked={selectedSporeLoadGraphFactors.includes(factor.name)}
                          onCheckedChange={() => toggleSporeLoadGraphFactor(factor.name)}
                          disabled={facetSporeLoadFactor === factor.name}
                        />
                        <label htmlFor={`spore-load-graph-${factor.name}`} className="text-sm cursor-pointer">
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
                    value={facetSporeLoadFactor || ''}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      setFacetSporeLoadFactor(value);
                      if (value && selectedSporeLoadGraphFactors.includes(value)) {
                        setSelectedSporeLoadGraphFactors(selectedSporeLoadGraphFactors.filter(f => f !== value));
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
                    id="exclude-zero-spore-load"
                    checked={excludeZeroSporeLoad}
                    onCheckedChange={setExcludeZeroSporeLoad}
                  />
                  <label htmlFor="exclude-zero-spore-load" className="text-sm cursor-pointer">
                    Exclude individuals with 0 spore load
                  </label>
                </div>
              </div>

              {selectedSporeLoadGraphFactors.length > 0 ? (
                !facetSporeLoadFactor ? (
                  <div>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart 
                        data={sporeLoadChartResult.boxData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name"
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                          interval={0}
                        />
                        <YAxis label={{ value: 'Mean Spore Load ± 95% CI', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border rounded p-2 shadow text-sm">
                                  <p className="font-semibold">{data.name}</p>
                                  <p>n = {data.n}</p>
                                  <p>Mean: {data.mean?.toFixed(0)}</p>
                                  <p>SD: {data.std?.toFixed(0)}</p>
                                  <p>SE: {data.se?.toFixed(0)}</p>
                                  <p>95% CI: [{(data.mean - data.ci95)?.toFixed(0)}, {(data.mean + data.ci95)?.toFixed(0)}]</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="mean" fill="#9333ea" name="Mean Spore Load">
                          <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#581c87" />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="p-2 text-left">Group</th>
                            <th className="p-2 text-right">n</th>
                            <th className="p-2 text-right">Mean</th>
                            <th className="p-2 text-right">SD</th>
                            <th className="p-2 text-right">SE</th>
                            <th className="p-2 text-right">95% CI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sporeLoadChartResult.boxData.map((box) => (
                            <tr key={box.name} className="border-b">
                              <td className="p-2 font-medium">{box.name}</td>
                              <td className="p-2 text-right">{box.n}</td>
                              <td className="p-2 text-right">{box.mean?.toFixed(0)}</td>
                              <td className="p-2 text-right">{box.std?.toFixed(0)}</td>
                              <td className="p-2 text-right">{box.se?.toFixed(0)}</td>
                              <td className="p-2 text-right">[{(box.mean - box.ci95)?.toFixed(0)}, {(box.mean + box.ci95)?.toFixed(0)}]</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sporeLoadFacetLevels.map(level => {
                      const facetResult = getSporeLoadChartData(level);
                      return (
                        <div key={level} className="border rounded-lg p-4">
                          <h3 className="text-center font-semibold mb-3">{facetSporeLoadFactor}: {level}</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart 
                              data={facetResult.boxData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name"
                                angle={-45} 
                                textAnchor="end" 
                                height={80}
                                fontSize={12}
                                interval={0}
                              />
                              <YAxis fontSize={12} label={{ value: 'Mean ± 95% CI', angle: -90, position: 'insideLeft' }} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white border rounded p-2 shadow text-xs">
                                        <p className="font-semibold">{data.name}</p>
                                        <p>n={data.n}, Mean={data.mean?.toFixed(0)} ± {data.ci95?.toFixed(0)}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="mean" fill="#9333ea" name="Mean">
                                <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#581c87" />
                              </Bar>
                            </ComposedChart>
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