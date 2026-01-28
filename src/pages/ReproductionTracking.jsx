import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useExperiment } from "../components/ExperimentContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { format } from "date-fns";
import { Download } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function ReproductionTracking() {
  const { t } = useTranslation();
  const { activeExperimentId } = useExperiment();
  const [selectedGroupFactors, setSelectedGroupFactors] = useState([]);
  const [groupByRedStatus, setGroupByRedStatus] = useState(false);
  const [excludeMales, setExcludeMales] = useState(false);
  const [selectedFacetFactors, setSelectedFacetFactors] = useState([]);
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);

  const { data: experiment } = useQuery({
    queryKey: ['experiment', activeExperimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: activeExperimentId });
      return exps[0];
    },
    enabled: !!activeExperimentId,
  });

  const { data: allIndividuals = [] } = useQuery({
    queryKey: ['individuals', activeExperimentId],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: activeExperimentId }),
    enabled: !!activeExperimentId,
  });

  const { data: allReproductionEvents = [] } = useQuery({
    queryKey: ['reproduction-events', activeExperimentId],
    queryFn: () => base44.entities.ReproductionEvent.filter({ experiment_id: activeExperimentId }),
    enabled: !!activeExperimentId,
  });

  // Build the dataset table
  const tableData = useMemo(() => {
    if (!allIndividuals.length) return { individuals: [], dates: [] };

    let filteredInds = excludeMales 
      ? allIndividuals.filter(ind => ind.sex !== 'male')
      : allIndividuals;

    // Get all unique event dates sorted
    const allDates = [...new Set(allReproductionEvents.map(e => e.event_date))].sort();

    // Build individual rows with reproduction by date
    const individuals = filteredInds.map(ind => {
      // Match events by individual_id (the string ID, not database id)
      const events = allReproductionEvents.filter(e => e.individual_id === ind.individual_id);
      const reproductionByDate = {};
      allDates.forEach(date => {
        const event = events.find(e => e.event_date === date);
        reproductionByDate[date] = event ? event.offspring_count : 0;
      });

      return {
        individual_id: ind.individual_id,
        factors: ind.factors || {},
        alive: ind.alive,
        red_confirmed: ind.red_confirmed,
        infected: ind.infected || 'not_tested',
        reproductionByDate
      };
    });

    return { individuals, dates: allDates };
  }, [allIndividuals, allReproductionEvents, excludeMales]);

  // Build the grouped line chart data with faceting and confidence intervals
  const chartData = useMemo(() => {
    if (!allIndividuals.length || selectedGroupFactors.length === 0) 
      return { facets: [], groupNames: [] };

    let filteredInds = excludeMales 
      ? allIndividuals.filter(ind => ind.sex !== 'male')
      : allIndividuals;

    // Build facets
    const facets = {};
    if (selectedFacetFactors.length > 0) {
      filteredInds.forEach(ind => {
        const facetKey = selectedFacetFactors
          .map(factor => ind.factors?.[factor] || 'Unknown')
          .join(' - ');
        if (!facets[facetKey]) {
          facets[facetKey] = [];
        }
        facets[facetKey].push(ind);
      });
    } else {
      facets['All'] = filteredInds;
    }

    // Process each facet
    const facetResults = Object.entries(facets).map(([facetName, facetIndividuals]) => {
      // Group individuals within this facet
      const groups = {};
      facetIndividuals.forEach(ind => {
        let groupKey = selectedGroupFactors
          .map(factor => ind.factors?.[factor] || 'Unknown')
          .join(' - ');
        
        if (groupByRedStatus) {
          const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
          groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(ind.individual_id);
      });

      // Get all events for each group and build cumulative over time
      const allDates = [...new Set(allReproductionEvents.map(e => e.event_date))].sort();
      
      const timeSeriesData = allDates.map(date => {
        const dataPoint = { date };
        
        Object.entries(groups).forEach(([groupName, individualIds]) => {
          // Get all events up to and including this date for this group
          const eventsUpToDate = allReproductionEvents.filter(e => 
            individualIds.includes(e.individual_id) && e.event_date <= date
          );
          
          // Calculate cumulative offspring per individual
          const cumulativeByIndividual = {};
          individualIds.forEach(id => {
            cumulativeByIndividual[id] = 0;
          });
          eventsUpToDate.forEach(e => {
            if (cumulativeByIndividual.hasOwnProperty(e.individual_id)) {
              cumulativeByIndividual[e.individual_id] += e.offspring_count;
            }
          });
          
          // Calculate mean and standard error
          const individualValues = Object.values(cumulativeByIndividual);
          const n = individualValues.length;
          const mean = n > 0 ? individualValues.reduce((a, b) => a + b, 0) / n : 0;
          
          let se = 0;
          if (n > 1) {
            const variance = individualValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
            se = Math.sqrt(variance) / Math.sqrt(n);
          }
          
          dataPoint[groupName] = mean;
          dataPoint[`${groupName}_lower`] = Math.max(0, mean - 1.96 * se); // 95% CI
          dataPoint[`${groupName}_upper`] = mean + 1.96 * se;
        });
        
        return dataPoint;
      });

      return {
        facetName,
        timeSeriesData,
        groupNames: Object.keys(groups)
      };
    });

    // Sort facets: put "Unknown" facets last
    facetResults.sort((a, b) => {
      const aHasUnknown = a.facetName.includes('Unknown');
      const bHasUnknown = b.facetName.includes('Unknown');
      if (aHasUnknown && !bHasUnknown) return 1;
      if (!aHasUnknown && bHasUnknown) return -1;
      return 0;
    });

    return { 
      facets: facetResults,
      groupNames: facetResults[0]?.groupNames || []
    };
  }, [allIndividuals, allReproductionEvents, selectedGroupFactors, groupByRedStatus, excludeMales, selectedFacetFactors]);

  const toggleGroupFactor = (factorName) => {
    setSelectedGroupFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const toggleFacetFactor = (factorName) => {
    setSelectedFacetFactors(prev => 
      prev.includes(factorName) 
        ? prev.filter(f => f !== factorName)
        : [...prev, factorName]
    );
  };

  const exportToCSV = () => {
    if (!tableData.individuals.length) return;

    const headers = [
      'Individual_ID',
      ...Object.keys(tableData.individuals[0].factors || {}),
      'Alive',
      'Red_Confirmed',
      'Infected',
      ...tableData.dates.map(d => `Date_${d}`)
    ];

    const rows = tableData.individuals.map(ind => [
      ind.individual_id,
      ...Object.values(ind.factors || {}),
      ind.alive ? 'Alive' : 'Dead',
      ind.red_confirmed ? 'Red+' : 'Red-',
      ind.infected,
      ...tableData.dates.map(d => ind.reproductionByDate[d])
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reproduction_tracking_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!experiment) {
    return <div className="p-8">Loading experiment...</div>;
  }

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reproduction Tracking</h1>
          <p className="text-gray-600 mt-1">Detailed reproduction data by individual and over time</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="exclude-males-repro"
              checked={excludeMales}
              onCheckedChange={setExcludeMales}
            />
            <label htmlFor="exclude-males-repro" className="text-sm font-medium cursor-pointer">
              {t('dashboard.excludeMales')}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Interactive grouped chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reproduction Over Time by Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Select factors to group by:</p>
              <div className="flex flex-wrap gap-4">
                {experiment.factors?.map(factor => (
                  <div key={factor.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${factor.name}`}
                      checked={selectedGroupFactors.includes(factor.name)}
                      onCheckedChange={() => toggleGroupFactor(factor.name)}
                    />
                    <label htmlFor={`group-${factor.name}`} className="text-sm cursor-pointer">
                      {factor.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="group-by-red"
                checked={groupByRedStatus}
                onCheckedChange={setGroupByRedStatus}
              />
              <label htmlFor="group-by-red" className="text-sm cursor-pointer">
                Differentiate by red status (Red+ vs Red-)
              </label>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Facet by (separate charts):</p>
              <div className="flex flex-wrap gap-4">
                {experiment.factors?.filter(f => !selectedGroupFactors.includes(f.name)).map(factor => (
                  <div key={factor.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`facet-${factor.name}`}
                      checked={selectedFacetFactors.includes(factor.name)}
                      onCheckedChange={() => toggleFacetFactor(factor.name)}
                    />
                    <label htmlFor={`facet-${factor.name}`} className="text-sm cursor-pointer">
                      {factor.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show-ci"
                checked={showConfidenceIntervals}
                onCheckedChange={setShowConfidenceIntervals}
              />
              <label htmlFor="show-ci" className="text-sm cursor-pointer">
                Show 95% confidence intervals
              </label>
            </div>
          </div>

          {selectedGroupFactors.length > 0 ? (
            <div className="space-y-6">
              {chartData.facets.map((facet, facetIdx) => (
                <div key={facetIdx}>
                  {chartData.facets.length > 1 && (
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">{facet.facetName}</h3>
                  )}
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={facet.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        label={{ value: 'Average Cumulative Offspring (± 95% CI)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      {facet.groupNames.map((groupName, idx) => (
                        <React.Fragment key={groupName}>
                          {showConfidenceIntervals && (
                            <Area
                              type="monotone"
                              dataKey={`${groupName}_upper`}
                              stroke="none"
                              fill={colors[idx % colors.length]}
                              fillOpacity={0.2}
                              legendType="none"
                              stackId={`ci-${idx}`}
                              baseValue="dataMin"
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey={groupName}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name={groupName}
                          />
                        </React.Fragment>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select at least one factor to display the grouped chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dataset table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reproduction Dataset by Date</CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-2 text-left sticky left-0 bg-gray-50 z-10 border-r">Individual ID</th>
                  {experiment.factors?.map(factor => (
                    <th key={factor.name} className="p-2 text-left border-r">{factor.name}</th>
                  ))}
                  <th className="p-2 text-left border-r">Status</th>
                  <th className="p-2 text-left border-r">Red</th>
                  <th className="p-2 text-left border-r">Infected</th>
                  {tableData.dates.map(date => (
                    <th key={date} className="p-2 text-center border-r">{date}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.individuals.map((ind, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono font-semibold sticky left-0 bg-white z-10 border-r">
                      {ind.individual_id}
                    </td>
                    {experiment.factors?.map(factor => (
                      <td key={factor.name} className="p-2 border-r">
                        {ind.factors[factor.name] || '-'}
                      </td>
                    ))}
                    <td className="p-2 border-r">
                      <span className={ind.alive ? "text-green-600 font-medium" : "text-gray-500"}>
                        {ind.alive ? 'Alive' : 'Dead'}
                      </span>
                    </td>
                    <td className="p-2 border-r">
                      <span className={ind.red_confirmed ? "text-red-600 font-medium" : "text-gray-400"}>
                        {ind.red_confirmed ? 'Red+' : 'Red-'}
                      </span>
                    </td>
                    <td className="p-2 border-r">
                      <span className={
                        ind.infected === 'confirmed Yes' ? "text-purple-600 font-medium" :
                        ind.infected === 'confirmed No' ? "text-gray-600" : "text-gray-400"
                      }>
                        {ind.infected === 'confirmed Yes' ? 'Yes' : 
                         ind.infected === 'confirmed No' ? 'No' : 'Not tested'}
                      </span>
                    </td>
                    {tableData.dates.map(date => (
                      <td key={date} className="p-2 text-center border-r">
                        <span className={ind.reproductionByDate[date] > 0 ? "font-semibold text-green-600" : "text-gray-300"}>
                          {ind.reproductionByDate[date]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableData.individuals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No reproduction data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}